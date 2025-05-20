<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let selectedOrders = [];
  export let orders = [];
  export let uniformConfigs = [];
  export let inventoryItems = [];
  export let isLoading = false;

  let materialsToDeduct = [];
  let hasEnoughMaterials = true;
  let materialsShortage = [];

  $: {
    if (selectedOrders.length > 0) {
      calculateMaterials();
    }
  }

  function calculateMaterials() {
    // Reset calculations
    materialsToDeduct = [];
    hasEnoughMaterials = true;
    materialsShortage = [];

    // Get selected order objects
    const selectedOrderObjects = orders.filter(order => 
      selectedOrders.includes(order.id) && order.status === 'pending'
    );

    // Create a map to accumulate materials
    const materialsMap = new Map();

    // Process each order
    selectedOrderObjects.forEach(order => {
      // Process for upper wear if applicable
      if (order.uniform_type === 'upper' || order.uniform_type === 'both') {
        processUniformPart(order, 'upper', materialsMap);
      }
      
      // Process for lower wear if applicable
      if (order.uniform_type === 'lower' || order.uniform_type === 'both') {
        processUniformPart(order, 'lower', materialsMap);
      }
    });

    // Convert the materials map to array and check inventory
    materialsToDeduct = Array.from(materialsMap.entries()).map(([materialId, quantity]) => {
      const materialIdNum = parseInt(materialId); // Ensure materialId is a number
      const item = inventoryItems.find(item => item.id === materialIdNum);
      const enoughStock = item && parseFloat(item.quantity_available) >= quantity;
      
      if (!enoughStock) {
        hasEnoughMaterials = false;
        materialsShortage.push({
          materialId: materialIdNum,
          name: item ? item.name : `Material #${materialId}`,
          required: quantity,
          available: item ? parseFloat(item.quantity_available) : 0
        });
      }

      return {
        materialId: materialIdNum,
        name: item ? item.name : `Material #${materialId}`,
        quantity,
        available: item ? parseFloat(item.quantity_available) : 0,
        enoughStock
      };
    });

    // Log the calculated materials for debugging
    console.log("Materials to deduct:", materialsToDeduct);
  }

  function processUniformPart(order, wearType, materialsMap) {
    // Find uniform config for this order part
    const config = uniformConfigs.find(cfg => 
      cfg.course_id === order.student.course_id && 
      cfg.gender === order.student.gender && 
      cfg.wear_type === wearType
    );

    // If no config found, skip
    if (!config) return;

    // Process base materials
    if (config.base_materials && Array.isArray(config.base_materials)) {
      config.base_materials.forEach(material => {
        const currentAmount = materialsMap.get(material.material_id.toString()) || 0;
        materialsMap.set(material.material_id.toString(), currentAmount + material.quantity);
      });
    }

    // Process measurement-based materials
    if (config.measurement_specs && Array.isArray(config.measurement_specs) && order.order_measurements) {
      config.measurement_specs.forEach(spec => {
        const studentMeasurement = order.order_measurements[spec.measurement_type_id];
        
        if (studentMeasurement && studentMeasurement > spec.base_cm) {
          const exceededCm = Math.ceil(studentMeasurement - spec.base_cm);
          
          // Process materials for this exceeded measurement
          if (spec.materials && Array.isArray(spec.materials)) {
            spec.materials.forEach(material => {
              const additionalMaterial = exceededCm * material.quantity_per_cm;
              const currentAmount = materialsMap.get(material.material_id.toString()) || 0;
              materialsMap.set(material.material_id.toString(), currentAmount + additionalMaterial);
            });
          }
        }
      });
    }
  }

  function confirmAssignment() {
    if (hasEnoughMaterials) {
      dispatch('confirm', {
        materialsToDeduct
      });
    }
  }

  function cancel() {
    dispatch('cancel');
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
  <div class="bg-white p-6 rounded-lg w-[700px] max-h-[90vh] overflow-auto">
    <div class="flex justify-between mb-6">
      <h2 class="text-2xl font-bold">Material Requirements</h2>
      <button on:click={cancel} class="text-gray-500 text-xl">&times;</button>
    </div>

    <div class="mb-6">
      <p class="text-lg mb-2">
        The following materials will be deducted from inventory:
      </p>
      <div class="border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left">Material</th>
              <th class="px-4 py-2 text-right">Required</th>
              <th class="px-4 py-2 text-right">Available</th>
              <th class="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each materialsToDeduct as material}
              <tr class={material.enoughStock ? '' : 'bg-red-50'}>
                <td class="px-4 py-3">{material.name}</td>
                <td class="px-4 py-3 text-right">{material.quantity}</td>
                <td class="px-4 py-3 text-right">{material.available}</td>
                <td class="px-4 py-3 text-right">
                  {#if material.enoughStock}
                    <span class="text-green-600">Available</span>
                  {:else}
                    <span class="text-red-600">Insufficient</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    {#if !hasEnoughMaterials}
      <div class="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
        <h3 class="text-red-700 font-medium mb-2">Insufficient Materials</h3>
        <ul class="list-disc pl-5 space-y-1">
          {#each materialsShortage as shortage}
            <li>
              <span class="font-medium">{shortage.name}</span>: 
              Need {shortage.required}, only {shortage.available} available 
              (Shortage: {shortage.required - shortage.available})
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="flex justify-end gap-3">
      <button 
        type="button" 
        class="px-4 py-2 border rounded hover:bg-gray-50" 
        on:click={cancel}
      >
        Cancel
      </button>
      <button 
        type="button" 
        class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark flex items-center gap-2 {!hasEnoughMaterials || isLoading ? 'opacity-50 cursor-not-allowed' : ''}" 
        disabled={!hasEnoughMaterials || isLoading}
        on:click={confirmAssignment}
      >
        {#if isLoading}
          <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
        {/if}
        Confirm Assignment
      </button>
    </div>
  </div>
</div>
