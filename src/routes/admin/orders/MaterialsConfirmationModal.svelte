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
  let materialBreakdown = []; // New: For detailed explanation of material usage

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
    materialBreakdown = []; // Reset the breakdown

    // Get selected order objects
    const selectedOrderObjects = orders.filter(order => 
      selectedOrders.includes(order.id) && order.status === 'pending'
    );

    // Create a map to accumulate materials
    const materialsMap = new Map();
    const breakdownMap = new Map(); // Track details for each material

    // Process each order
    selectedOrderObjects.forEach(order => {
      // Process for upper wear if applicable
      if (order.uniform_type === 'upper' || order.uniform_type === 'both') {
        processUniformPart(order, 'upper', materialsMap, breakdownMap);
      }
      
      // Process for lower wear if applicable
      if (order.uniform_type === 'lower' || order.uniform_type === 'both') {
        processUniformPart(order, 'lower', materialsMap, breakdownMap);
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

    // Create detailed breakdown for UI
    materialBreakdown = Array.from(breakdownMap.values()).sort((a, b) => a.materialName.localeCompare(b.materialName));

    // Log the calculated materials for debugging
    console.log("Materials to deduct:", materialsToDeduct);
    console.log("Material breakdown:", materialBreakdown);
  }

  function processUniformPart(order, wearType, materialsMap, breakdownMap) {
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
        const materialId = material.material_id.toString();
        const currentAmount = materialsMap.get(materialId) || 0;
        materialsMap.set(materialId, currentAmount + material.quantity);
        
        // Add to breakdown
        updateBreakdown(breakdownMap, materialId, material.quantity, order.id, "base", 
          `Base material for ${wearType} wear uniform`);
      });
    }

    // Process measurement-based materials
    if (config.measurement_specs && Array.isArray(config.measurement_specs) && order.order_measurements) {
      config.measurement_specs.forEach(spec => {
        const measurementType = spec.measurement_type_id;
        const studentMeasurement = order.order_measurements[measurementType];
        const studentName = `${order.student.first_name} ${order.student.last_name}`;
        
        if (studentMeasurement && studentMeasurement > spec.base_cm) {
          const exceededCm = Math.ceil(studentMeasurement - spec.base_cm);
          const measurementTypeName = getMeasurementTypeName(measurementType);
          
          // Process materials for this exceeded measurement
          if (spec.materials && Array.isArray(spec.materials)) {
            spec.materials.forEach(material => {
              const materialId = material.material_id.toString();
              const additionalMaterial = exceededCm * material.quantity_per_cm;
              const currentAmount = materialsMap.get(materialId) || 0;
              materialsMap.set(materialId, currentAmount + additionalMaterial);
              
              // Add to breakdown with specific details
              updateBreakdown(breakdownMap, materialId, additionalMaterial, order.id, "excess", 
                `Extra material for Order #${order.id} (${studentName}): ${measurementTypeName} exceeds standard by ${exceededCm}cm (${studentMeasurement}cm vs. ${spec.base_cm}cm standard)`);
            });
          }
        }
      });
    }
  }

  function updateBreakdown(breakdownMap, materialId, quantity, orderId, type, reason) {
    const numMaterialId = parseInt(materialId);
    const material = inventoryItems.find(item => item.id === numMaterialId);
    
    if (!material) return;
    
    const key = numMaterialId.toString();
    
    if (!breakdownMap.has(key)) {
      breakdownMap.set(key, {
        materialId: numMaterialId,
        materialName: material.name,
        unit: material.unit_of_measurement,
        totalQuantity: 0,
        details: []
      });
    }
    
    const entry = breakdownMap.get(key);
    entry.totalQuantity += quantity;
    entry.details.push({
      orderId,
      quantity,
      type,
      reason
    });
  }

  function getMeasurementTypeName(typeId) {
    // This is a placeholder - in reality, you might want to pass measurement type names
    // from the parent component or fetch them from your data
    const measurementNames = {
      1: "Shoulder Width",
      2: "Chest Circumference",
      3: "Waist",
      4: "Hip",
      5: "Sleeve Length",
      6: "Inseam",
      // Add more mappings as needed
    };
    
    return measurementNames[typeId] || `Measurement #${typeId}`;
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

  // Group breakdown by type
  function getBaseBreakdown(breakdown) {
    return breakdown.details.filter(d => d.type === "base");
  }
  
  function getExcessBreakdown(breakdown) {
    return breakdown.details.filter(d => d.type === "excess");
  }
  
  // Calculate total for each type
  function getBaseTotalForMaterial(breakdown) {
    return breakdown.details
      .filter(d => d.type === "base")
      .reduce((sum, d) => sum + d.quantity, 0);
  }
  
  function getExcessTotalForMaterial(breakdown) {
    return breakdown.details
      .filter(d => d.type === "excess")
      .reduce((sum, d) => sum + d.quantity, 0);
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
  <div class="bg-white p-6 rounded-lg w-[90%] max-w-5xl max-h-[90vh] overflow-auto">
    <div class="flex justify-between mb-4">
      <h2 class="text-2xl font-bold text-primary">Material Requirements</h2>
      <button on:click={cancel} class="text-gray-500 text-xl">&times;</button>
    </div>

    <!-- Explanation Box -->
    <div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="font-medium text-blue-800 mb-2 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        How Materials Are Calculated
      </h3>
      <p class="text-sm text-blue-700 mb-2">
        Materials are deducted from inventory in two categories:
      </p>
      <ul class="text-sm text-blue-700 ml-5 list-disc space-y-1">
        <li><span class="font-medium">Base Materials</span>: Fixed quantities required for each uniform regardless of measurements.</li>
        <li><span class="font-medium">Excess Materials</span>: Additional materials needed when student measurements exceed standard sizes.</li>
      </ul>
    </div>

    <div class="mb-6">
      <h3 class="text-lg font-medium mb-2">
        Material Summary
      </h3>
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
                <td class="px-4 py-3 text-right">{material.quantity.toFixed(2)}</td>
                <td class="px-4 py-3 text-right">{material.available.toFixed(2)}</td>
                <td class="px-4 py-3 text-right">
                  {#if material.enoughStock}
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg xmlns="http://www.w3.org/2000/svg" class="-ml-0.5 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      Available
                    </span>
                  {:else}
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <svg xmlns="http://www.w3.org/2000/svg" class="-ml-0.5 mr-1.5 h-2 w-2 text-red-400" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      Insufficient
                    </span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detailed Material Breakdown -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-medium">Material Breakdown</h3>
        <div class="flex items-center text-xs space-x-4">
          <div class="flex items-center">
            <span class="w-3 h-3 inline-block bg-gray-100 rounded-sm mr-1"></span>
            <span>Base Material</span>
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 inline-block bg-blue-100 rounded-sm mr-1"></span>
            <span>Excess Material</span>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        {#each materialBreakdown as breakdown}
          <div class="border rounded-lg overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
              <h4 class="font-medium">{breakdown.materialName}</h4>
              <div class="flex items-center space-x-2">
                <span class="text-sm">Total: <span class="font-medium">{breakdown.totalQuantity.toFixed(2)} {breakdown.unit}</span></span>
              </div>
            </div>
            
            <!-- Base Materials -->
            {#if getBaseBreakdown(breakdown).length > 0}
              <div class="px-4 py-3 bg-gray-100/50 border-b">
                <div class="flex justify-between items-center mb-2">
                  <h5 class="text-sm font-medium text-gray-700">Base Materials</h5>
                  <span class="text-xs font-medium">{getBaseTotalForMaterial(breakdown).toFixed(2)} {breakdown.unit}</span>
                </div>
                <ul class="text-xs space-y-1 text-gray-600">
                  {#each getBaseBreakdown(breakdown) as detail}
                    <li class="flex justify-between">
                      <span>{detail.reason}</span>
                      <span>{detail.quantity.toFixed(2)} {breakdown.unit}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            <!-- Excess Materials -->
            {#if getExcessBreakdown(breakdown).length > 0}
              <div class="px-4 py-3 bg-blue-100/50">
                <div class="flex justify-between items-center mb-2">
                  <h5 class="text-sm font-medium text-blue-700">Extra Materials for Non-Standard Sizes</h5>
                  <span class="text-xs font-medium">{getExcessTotalForMaterial(breakdown).toFixed(2)} {breakdown.unit}</span>
                </div>
                <ul class="text-xs space-y-1 text-blue-800">
                  {#each getExcessBreakdown(breakdown) as detail}
                    <li class="flex justify-between items-start">
                      <span class="flex-1">{detail.reason}</span>
                      <span class="ml-2 whitespace-nowrap">{detail.quantity.toFixed(2)} {breakdown.unit}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    {#if !hasEnoughMaterials}
      <div class="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
        <h3 class="text-red-700 font-medium mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          Insufficient Materials
        </h3>
        <ul class="list-disc pl-5 space-y-1">
          {#each materialsShortage as shortage}
            <li>
              <span class="font-medium">{shortage.name}</span>: 
              Need {shortage.required.toFixed(2)}, only {shortage.available.toFixed(2)} available 
              (Shortage: {(shortage.required - shortage.available).toFixed(2)})
            </li>
          {/each}
        </ul>
        <p class="mt-2 text-sm text-red-700">Please restock these materials before assigning the orders.</p>
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
