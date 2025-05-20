<script>
  import { enhance } from "$app/forms";
  import { invalidate } from "$app/navigation";

  export let data;

  let configs = data.configs || [];
  let courses = data.courses || [];
  let measurementTypes = data.measurementTypes || [];
  let inventoryItems = data.inventoryItems || [];
  let selectedConfig = null;
  let showForm = false;
  let isLoading = false;
  let showErrorModal = false;
  let errorMessage = "";
  let searchTerm = "";
  let showDeleteModal = false;
  let configToDelete = null;

  // Sorting logic
  let sortField = "created_at";
  let sortDirection = "desc";

  $: filteredConfigs = configs
    ?.filter(
      (c) =>
        c.courses?.course_code
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        c.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.wear_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.base_price?.toString().includes(searchTerm) ||
        c.student_count?.toString().includes(searchTerm)
    )
    ?.sort((a, b) => {
      let aVal = sortField === "course" ? a.courses?.course_code : a[sortField];
      let bVal = sortField === "course" ? b.courses?.course_code : b[sortField];

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  function toggleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDirection = "asc";
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function resetForm() {
    selectedConfig = null;
    selectedCourseId = "";
    selectedGender = "";
    selectedWearType = "";
    showForm = false;
    isLoading = false;
    selectedMeasurements = new Set();
  }

  function showError(message) {
    console.log("here at showError");
    errorMessage = message;
    showErrorModal = true;
    isLoading = false;
  }

  function resetDeleteModal() {
    showDeleteModal = false;
    configToDelete = null;
  }

  const handleSubmit = () => {
    isLoading = true;
    return async ({ result }) => {
      if (result.type === "success") {
        resetForm();
        await invalidate("app:configs");
        window.location.reload(); // Force reload to ensure fresh data
      } else if (result.type === "error") {
        showError(result.data?.error || "Operation failed");
      }
      isLoading = false;
    };
  };

  const handleDelete = () => {
    return async ({ result }) => {
      console.log("Backend result:", result);
      resetDeleteModal();

      if (result.data?.data?.error) {
        showError(result.data?.data?.error);
      } else if (result.type === "success") {
        await invalidate("app:configs");
        window.location.reload();
      } else {
        showError("An unexpected error occurred.");
      }
    };
  };

  // Track selected measurement types
  let selectedMeasurements = new Set();

  // Initialize selected measurements when editing
  $: if (selectedConfig) {
    // Convert measurement_specs array to Set of measurement_type_ids
    selectedMeasurements = new Set(
      selectedConfig.measurement_specs?.map(
        (spec) => spec.measurement_type_id
      ) || []
    );
  }

  // Add the configuration map
  let configurationMap = data.configurationMap;

  // Local variables to hold selected options
  let selectedCourseId = "";
  let selectedGender = "";
  let selectedWearType = "";

  // Compute disabled options based on existing configurations
  $: disabledGenders =
    selectedCourseId && !selectedConfig
      ? getDisabledGenders(selectedCourseId)
      : [];

  $: disabledWearTypes =
    selectedCourseId && selectedGender && !selectedConfig
      ? getDisabledWearTypes(selectedCourseId, selectedGender)
      : [];

  function getDisabledGenders(courseId) {
    const genders = ["male", "female"];
    const disabled = [];
    if (configurationMap[courseId]) {
      genders.forEach((gender) => {
        const wearTypes = configurationMap[courseId][gender];
        if (wearTypes && wearTypes.size >= 2) {
          // Assuming two wear types: 'upper' and 'lower'
          disabled.push(gender);
        }
      });
    }
    return disabled;
  }

  function getDisabledWearTypes(courseId, gender) {
    if (configurationMap[courseId] && configurationMap[courseId][gender]) {
      return Array.from(configurationMap[courseId][gender]);
    }
    return [];
  }

  function isCourseDisabled(courseId) {
    const genders = ["male", "female"];
    if (configurationMap[courseId]) {
      return genders.every((gender) => {
        const wearTypes = configurationMap[courseId][gender];
        return wearTypes && wearTypes.size >= 2;
      });
    }
    return false;
  }

  // Update selectedConfig when editing
  $: if (selectedConfig) {
    selectedCourseId = selectedConfig.course_id?.toString(); // Ensure selectedCourseId is a string
    selectedGender = selectedConfig.gender;
    selectedWearType = selectedConfig.wear_type;
  }

  // Add pagination state
  let currentPage = 1;
  let rowsPerPage = 10;

  // Calculate total pages and paginated configs
  $: totalPages = Math.ceil((filteredConfigs?.length || 0) / rowsPerPage);
  $: paginatedConfigs = filteredConfigs?.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Navigation functions
  function nextPage() {
    if (currentPage < totalPages) currentPage++;
  }

  function prevPage() {
    if (currentPage > 1) currentPage--;
  }

  function goToPage(page) {
    currentPage = page;
  }

  // Reset to first page when filters change
  $: if (searchTerm) {
    currentPage = 1;
  }

  // Generate page numbers for pagination
  $: pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  // Track measurement specifications
  let measurementSpecs = {};

  // Initialize measurement specs when editing
  $: if (selectedConfig) {
    // Convert measurement_specs array to object for easier access
    measurementSpecs = {};
    selectedConfig.measurement_specs?.forEach(spec => {
      measurementSpecs[spec.measurement_type_id] = {
        base_cm: spec.base_cm,
        additional_cost_per_cm: spec.additional_cost_per_cm,
        materials: spec.materials || []
      };
    });
  }

  // Track base materials for uniform
  let uniformBaseMaterials = new Set();
  let uniformBaseMaterialQuantities = {};

  // Initialize base materials when editing
  $: if (selectedConfig && selectedConfig.base_materials) {
    uniformBaseMaterials = new Set(
      selectedConfig.base_materials.map(m => m.material_id)
    );
    
    uniformBaseMaterialQuantities = {};
    selectedConfig.base_materials.forEach(material => {
      uniformBaseMaterialQuantities[material.material_id] = material.quantity;
    });
  }

  // Toggle selection of base material for uniform
  function toggleUniformBaseMaterial(materialId) {
    uniformBaseMaterials = new Set(uniformBaseMaterials);
    
    if (uniformBaseMaterials.has(materialId)) {
      uniformBaseMaterials.delete(materialId);
    } else {
      uniformBaseMaterials.add(materialId);
      
      if (!uniformBaseMaterialQuantities[materialId]) {
        uniformBaseMaterialQuantities[materialId] = 0;
      }
    }
  }

  // Track selected materials for each measurement type
  let selectedMaterialsByMeasurement = {};

  // Initialize selected materials when editing
  $: if (selectedConfig) {
    selectedMaterialsByMeasurement = {};
    
    selectedConfig.measurement_specs?.forEach(spec => {
      if (spec.materials && spec.materials.length > 0) {
        selectedMaterialsByMeasurement[spec.measurement_type_id] = new Set(
          spec.materials.map(m => m.material_id)
        );
        
        // Convert old format to new format if needed
        spec.materials.forEach(material => {
          if ('base_quantity' in material || 'additional_quantity_per_cm' in material) {
            // Use additional_quantity_per_cm as the primary value, or base_quantity as fallback
            const quantityPerCm = material.additional_quantity_per_cm || (material.base_quantity ? material.base_quantity / spec.base_cm : 0);
            material.quantity_per_cm = quantityPerCm;
          }
        });
      } else {
        selectedMaterialsByMeasurement[spec.measurement_type_id] = new Set();
      }
    });
  }

  // Toggle selection of material for a measurement type
  function toggleMaterialForMeasurement(measurementTypeId, materialId) {
    if (!selectedMaterialsByMeasurement[measurementTypeId]) {
      selectedMaterialsByMeasurement[measurementTypeId] = new Set();
    }
    
    const materials = new Set(selectedMaterialsByMeasurement[measurementTypeId]);
    
    if (materials.has(materialId)) {
      materials.delete(materialId);
    } else {
      materials.add(materialId);
      
      // Initialize material quantities if not set
      if (!measurementSpecs[measurementTypeId].materials) {
        measurementSpecs[measurementTypeId].materials = [];
      }
      
      const existingMaterial = measurementSpecs[measurementTypeId].materials.find(
        m => m.material_id === materialId
      );
      
      if (!existingMaterial) {
        measurementSpecs[measurementTypeId].materials.push({
          material_id: materialId,
          quantity_per_cm: 0
        });
      }
    }
    
    selectedMaterialsByMeasurement[measurementTypeId] = materials;
  }

  // Handle measurement selection with default values
  function toggleMeasurement(typeId) {
    selectedMeasurements = new Set(selectedMeasurements); // Create new Set to ensure reactivity
    
    if (selectedMeasurements.has(typeId)) {
      // Remove the measurement
      selectedMeasurements.delete(typeId);
      // We don't delete from measurementSpecs to preserve values if re-added
    } else {
      // Add the measurement
      selectedMeasurements.add(typeId);
      
      // If there's no existing spec for this measurement type
      if (!measurementSpecs[typeId]) {
        // Find the measurement type to get default values
        const measurementType = measurementTypes.find(mt => mt.id === typeId);
        
        // Add default values if available, otherwise use 0
        measurementSpecs[typeId] = {
          base_cm: measurementType?.default_base_cm || 0,
          additional_cost_per_cm: measurementType?.default_additional_cost_per_cm || 0,
          materials: []
        };
      }
      
      // Initialize materials set for this measurement
      if (!selectedMaterialsByMeasurement[typeId]) {
        selectedMaterialsByMeasurement[typeId] = new Set();
      }
    }
  }

  // Get material name by ID
  function getMaterialName(materialId) {
    const material = inventoryItems.find(item => item.id === materialId);
    return material ? material.name : 'Unknown Material';
  }

  // Get material unit by ID
  function getMaterialUnit(materialId) {
    const material = inventoryItems.find(item => item.id === materialId);
    return material ? material.unit_of_measurement : '';
  }

  // Update material quantities - simplified to use only quantity_per_cm
  function updateMaterialQuantity(measurementTypeId, materialId, value) {
    if (!measurementSpecs[measurementTypeId].materials) {
      measurementSpecs[measurementTypeId].materials = [];
    }
    
    const materialIndex = measurementSpecs[measurementTypeId].materials.findIndex(
      m => m.material_id === materialId
    );
    
    if (materialIndex >= 0) {
      measurementSpecs[measurementTypeId].materials[materialIndex].quantity_per_cm = parseFloat(value) || 0;
    } else {
      const newMaterial = {
        material_id: materialId,
        quantity_per_cm: parseFloat(value) || 0
      };
      measurementSpecs[measurementTypeId].materials.push(newMaterial);
    }
  }
  
  // Convert material arrays to format needed for form submission
  function getMaterialsForMeasurement(measurementTypeId) {
    if (!measurementSpecs[measurementTypeId] || !measurementSpecs[measurementTypeId].materials) {
      return [];
    }
    return measurementSpecs[measurementTypeId].materials;
  }

  // For material usage example calculation
  let exampleStudentSize = {};
  let showAllMeasurements = true;
  let exampleAddToAll = 0; // Default to 0 instead of 5

  // Initialize example sizes with base values from measurement specs
  $: {
    if (selectedMeasurements.size > 0 && Object.keys(exampleStudentSize).length === 0) {
      const newSizes = {};
      selectedMeasurements.forEach(typeId => {
        const spec = measurementSpecs[typeId] || {};
        newSizes[typeId] = spec.base_cm || 0;
      });
      exampleStudentSize = newSizes;
    }
  }

  // Make example sizes reactive to base size changes
  $: {
    selectedMeasurements.forEach(typeId => {
      if (measurementSpecs[typeId] && exampleStudentSize[typeId] !== undefined) {
        // Only update if they match the base + additional pattern
        const currentDiff = (exampleStudentSize[typeId] || 0) - (measurementSpecs[typeId]?.base_cm || 0);
        if (Math.abs(currentDiff - exampleAddToAll) < 0.001) {
          exampleStudentSize[typeId] = (measurementSpecs[typeId]?.base_cm || 0) + exampleAddToAll;
        }
      }
    });
  }

  // Apply additional cm to all measurements reactively when exampleAddToAll changes
  $: {
    if (selectedMeasurements.size > 0) {
      const newSizes = {...exampleStudentSize};
      selectedMeasurements.forEach(typeId => {
        const spec = measurementSpecs[typeId] || {};
        newSizes[typeId] = (spec.base_cm || 0) + parseFloat(exampleAddToAll || 0);
      });
      exampleStudentSize = newSizes;
    }
  }

  // Reset all measurements to zero
  function resetExampleSizes() {
    const newSizes = {};
    selectedMeasurements.forEach(typeId => {
      newSizes[typeId] = 0;
    });
    exampleStudentSize = newSizes;
    exampleAddToAll = 0; // Reset the input value too
  }
  
  // Calculate the difference between student size and base size for a measurement
  function getExampleDifference(typeId) {
    const spec = measurementSpecs[typeId] || {};
    return (exampleStudentSize[typeId] || 0) - (spec.base_cm || 0);
  }

  // Make all calculation functions reactive to their inputs
  $: calculateMeasurementPrice = (typeId) => {
    const spec = measurementSpecs[typeId] || {};
    const extraCm = Math.max(0, getExampleDifference(typeId));
    const additionalCost = extraCm * (spec.additional_cost_per_cm || 0);
    
    return additionalCost.toFixed(2);
  };

  $: calculateTotalPrice = () => {
    let total = parseFloat(selectedConfig?.base_price || 0);
    
    selectedMeasurements.forEach(typeId => {
      total += parseFloat(calculateMeasurementPrice(typeId));
    });
    
    return total.toFixed(2);
  };

  $: exampleMaterialTotal = (materialSpec, typeId) => {
    const quantityPerCm = parseFloat(materialSpec.quantity_per_cm) || 0;
    const studentSize = parseFloat(exampleStudentSize[typeId]) || 0;
    
    return (quantityPerCm * studentSize).toFixed(2);
  };

  $: getAllMaterialsNeeded = () => {
    const materialsMap = new Map();
    
    // Add base uniform materials
    uniformBaseMaterials.forEach(materialId => {
      const quantity = parseFloat(uniformBaseMaterialQuantities[materialId] || 0);
      if (quantity > 0) {
        materialsMap.set(materialId, {
          quantity,
          material: inventoryItems.find(item => item.id === materialId)
        });
      }
    });
    
    // Add materials from each measurement
    selectedMeasurements.forEach(typeId => {
      const materials = selectedMaterialsByMeasurement[typeId];
      if (materials && materials.size > 0) {
        materials.forEach(materialId => {
          const materialSpec = getMaterialsForMeasurement(typeId).find(m => m.material_id === materialId);
          if (materialSpec) {
            const material = inventoryItems.find(item => item.id === materialId);
            const quantity = parseFloat(exampleMaterialTotal(materialSpec, typeId));
            
            if (materialsMap.has(materialId)) {
              // Add to existing material
              const existing = materialsMap.get(materialId);
              materialsMap.set(materialId, {
                quantity: existing.quantity + quantity,
                material
              });
            } else {
              // Add new material
              materialsMap.set(materialId, {
                quantity,
                material
              });
            }
          }
        });
      }
    });
    
    return Array.from(materialsMap.values());
  };
</script>

<div class="p-6">
  <!-- Header Section -->
  <div
    class="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 mb-6"
  >
    <!-- Header Section -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <div class="bg-primary/10 p-3 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="text-primary w-6 h-6"
            viewBox="0 0 512 512"
            {...$$props}
          >
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="m234.67 85.33l-.004 213.338h-21.333v42.666h21.333l.005 85.33h42.666l-.004-85.33h21.333v-42.666h-21.333l.004-213.338zm-128.006 0v85.355H85.331v42.645h21.333v213.333h42.667V213.33h21.333v-42.645h-21.333V85.33zm255.981.004v128h-21.333l.013 42.663h21.333v170.666h42.688V255.997h21.333l-.013-42.663h-21.333l.013-128.004z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">
            Uniform Configuration
          </h1>
          <p class="text-sm text-gray-500">
            Manage and customize uniform configurations
          </p>
        </div>
      </div>
    </div>
    <button
      on:click={() => {
        selectedConfig = null;
        showForm = true;
      }}
      class="w-full md:w-auto bg-primary text-white px-4 py-2 rounded-lg"
      disabled={isLoading}
    >
      Add New Configuration
    </button>
  </div>

  <!-- Main content card -->
  <div class="bg-white p-6 rounded-lg shadow-md">
    <div class="flex flex-col md:flex-row justify-between gap-4 md:gap-0 mb-4">
      <h2 class="text-xl font-semibold">Configurations List</h2>
      <input
        type="text"
        placeholder="Search configurations..."
        bind:value={searchTerm}
        class="w-full md:w-auto border rounded p-2"
      />
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[800px]">
        <thead>
          <tr class="bg-gray-50">
            <th
              class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
              on:click={() => toggleSort("course")}
            >
              <div class="flex items-center gap-1">
                Course
                {#if sortField === "course"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 {sortDirection === 'asc'
                      ? 'transform rotate-180'
                      : ''}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                {/if}
              </div>
            </th>
            <th
              class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
              on:click={() => toggleSort("gender")}
            >
              <div class="flex items-center gap-1">
                Gender
                {#if sortField === "gender"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 {sortDirection === 'asc'
                      ? 'transform rotate-180'
                      : ''}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                {/if}
              </div>
            </th>
            <th
              class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
              on:click={() => toggleSort("base_price")}
            >
              <div class="flex items-center gap-1">
                Base Price
                {#if sortField === "base_price"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 {sortDirection === 'asc'
                      ? 'transform rotate-180'
                      : ''}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                {/if}
              </div>
            </th>
            <th
              class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
              on:click={() => toggleSort("wear_type")}
            >
              <div class="flex items-center gap-1">
                Wear Type
                {#if sortField === "wear_type"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 {sortDirection === 'asc'
                      ? 'transform rotate-180'
                      : ''}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                {/if}
              </div>
            </th>
            <th
              class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
              on:click={() => toggleSort("created_at")}
            >
              <div class="flex items-center gap-1">
                Created At
                {#if sortField === "created_at"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 {sortDirection === 'asc'
                      ? 'transform rotate-180'
                      : ''}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                {/if}
              </div>
            </th>
            <th class="p-4 text-left font-semibold text-gray-600"
              >Reg. Students</th
            >
            <th class="p-4 text-right font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each paginatedConfigs || [] as config (config.id)}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="p-4">
                <span
                  class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {config.courses?.course_code || "N/A"}
                </span>
              </td>
              <td class="p-4">
                <span
                  class="px-2 py-1 rounded-full text-sm {config.gender ===
                  'male'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-pink-100 text-pink-800'}"
                >
                  {config.gender}
                </span>
              </td>
              <td class="p-4">₱{config.base_price.toFixed(2)}</td>
              <td class="p-4">
                <span
                  class="px-2 py-1 rounded-full text-sm {config.wear_type ===
                  'upper'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-indigo-100 text-indigo-800'}"
                >
                  {config.wear_type}
                </span>
              </td>
              <td class="p-4">{formatDate(config.created_at)}</td>
              <td class="p-4">
                <span
                  class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                >
                  {config.student_count} student/s
                </span>
              </td>
              <td class="p-4 text-right">
                <button
                  class="text-blue-600 hover:text-blue-800 mr-2"
                  on:click={() => {
                    selectedConfig = config;
                    showForm = true;
                  }}
                >
                  Edit
                </button>
                <button
                  class="text-red-600 hover:text-red-800"
                  on:click={() => {
                    configToDelete = config;
                    showDeleteModal = true;
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="7" class="py-8 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-10 w-10 text-gray-300 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p class="text-lg font-medium">No configurations found</p>
                  <p class="text-sm">Try adjusting your search</p>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Add Pagination Controls -->
      <div class="flex items-center justify-between px-4 py-3 border-t">
        <div class="flex items-center text-sm text-gray-500">
          Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(
            currentPage * rowsPerPage,
            filteredConfigs?.length || 0
          )} of {filteredConfigs?.length || 0} entries
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1 rounded border {currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'hover:bg-gray-50'}"
            on:click={prevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {#each pageNumbers as pageNum}
            <button
              class="px-3 py-1 rounded border {currentPage === pageNum
                ? 'bg-primary text-white'
                : 'hover:bg-gray-50'}"
              on:click={() => goToPage(pageNum)}
            >
              {pageNum}
            </button>
          {/each}

          <button
            class="px-3 py-1 rounded border {currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'hover:bg-gray-50'}"
            on:click={nextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Configuration Form Modal -->
  {#if showForm}
    <div
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 md:p-4"
    >
      <div
        class="bg-gradient-to-br from-white via-gray-50 to-muted rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(183,50,51,0.15)] border border-white/50 overflow-hidden animate-scale"
      >
        <!-- Modal Header -->
        <div
          class="p-4 md:p-6 bg-gradient-to-r from-primary to-primary-dark border-b border-primary/10"
        >
          <h2 class="text-xl md:text-2xl font-bold text-white">
            {selectedConfig ? "Edit Configuration" : "New Configuration"}
          </h2>
          <p class="text-sm md:text-base text-muted mt-2">
            Configure uniform specifications, measurements, and materials
          </p>
        </div>

        <!-- Modal Body - Scrollable -->
        <div class="flex-1 flex overflow-hidden">
          <form
            id="configForm"
            method="POST"
            action={selectedConfig ? "?/update" : "?/create"}
            use:enhance={handleSubmit}
            class="flex-1 flex flex-col md:flex-row overflow-hidden"
          >
            {#if selectedConfig}
              <input type="hidden" name="id" value={selectedConfig.id} />
            {/if}

            <div class="flex flex-col md:flex-row flex-1 overflow-hidden">
              <!-- Left Column - Basic Info -->
              <div
                class="w-full md:w-1/3 p-4 md:p-6 max-h-[30vh] md:max-h-[calc(90vh-8rem)] overflow-y-auto border-b md:border-b-0 md:border-r border-primary/10"
              >
                <div
                  class="bg-white/80 p-4 md:p-6 rounded-xl border border-primary/10 shadow-sm"
                >
                  <h3
                    class="text-base md:text-lg font-semibold text-primary mb-4"
                  >
                    Basic Information
                  </h3>
                  
                  <div class="space-y-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-600 mb-1"
                        for="courseId">Course</label
                      >
                      <select
                        name="courseId"
                        bind:value={selectedCourseId}
                        on:change={() => {
                          selectedGender = "";
                          selectedWearType = "";
                        }}
                        class="block w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/50 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                        disabled={selectedConfig ? true : false}
                        required
                      >
                        <option value="">Select Course</option>
                        {#each courses as course}
                          <option
                            value={course.id.toString()}
                            disabled={!selectedConfig &&
                              isCourseDisabled(course.id.toString()) &&
                              course.id.toString() !== selectedCourseId}
                          >
                            {course.course_code}
                            {#if !selectedConfig && isCourseDisabled(course.id.toString()) && course.id.toString() !== selectedCourseId}
                              (All Configurations Set)
                            {/if}
                          </option>
                        {/each}
                      </select>
                      {#if selectedConfig}
                        <input
                          type="hidden"
                          name="courseId"
                          value={selectedCourseId}
                        />
                      {/if}
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-600 mb-1"
                        for="gender">Gender</label
                      >
                      <select
                        name="gender"
                        bind:value={selectedGender}
                        on:change={() => (selectedWearType = "")}
                        class="block w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/50 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                        disabled={selectedConfig ? true : false}
                        required
                      >
                        <option value="">Select Gender</option>
                        <option
                          value="male"
                          disabled={!selectedConfig &&
                            disabledGenders.includes("male")}
                        >
                          Male
                          {#if !selectedConfig && disabledGenders.includes("male")}
                            (All Wear Types Configured)
                          {/if}
                        </option>
                        <option
                          value="female"
                          disabled={!selectedConfig &&
                            disabledGenders.includes("female")}
                        >
                          Female
                          {#if !selectedConfig && disabledGenders.includes("female")}
                            (All Wear Types Configured)
                          {/if}
                        </option>
                      </select>
                      {#if selectedConfig}
                        <input
                          type="hidden"
                          name="gender"
                          value={selectedGender}
                        />
                      {/if}
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-600 mb-1"
                        for="wearType">Wear Type</label
                      >
                      <select
                        name="wearType"
                        bind:value={selectedWearType}
                        class="block w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/50 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                        disabled={selectedConfig ? true : false}
                        required
                      >
                        <option value="">Select Wear Type</option>
                        <option
                          value="upper"
                          disabled={!selectedConfig &&
                            disabledWearTypes.includes("upper")}
                        >
                          Upper
                          {#if !selectedConfig && disabledWearTypes.includes("upper")}
                            (Already Configured)
                          {/if}
                        </option>
                        <option
                          value="lower"
                          disabled={!selectedConfig &&
                            disabledWearTypes.includes("lower")}
                        >
                          Lower
                          {#if !selectedConfig && disabledWearTypes.includes("lower")}
                            (Already Configured)
                          {/if}
                        </option>
                      </select>
                      {#if selectedConfig}
                        <input
                          type="hidden"
                          name="wearType"
                          value={selectedWearType}
                        />
                      {/if}
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-600 mb-1"
                        for="basePrice">Base Price (₱)</label>
                      <input
                        type="number"
                        name="basePrice"
                        step="0.01"
                        value={selectedConfig?.base_price || ""}
                        class="block w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/50 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                        required
                      />
                    </div>
                    <!-- Base Materials for Entire Uniform -->
                    <div class="mt-6">
                      <h4 class="text-sm font-medium text-primary/70 mb-3">
                        Base Materials for Uniform
                      </h4>
                      
                      <div class="space-y-2">
                        {#each inventoryItems as material}
                          <div class="flex items-center justify-between bg-white/90 p-2 rounded-lg border border-gray-100 hover:border-primary/20">
                            <div class="flex items-center">
                              <input
                                type="checkbox"
                                name="uniformBaseMaterials"
                                value={material.id}
                                checked={uniformBaseMaterials.has(material.id)}
                                on:change={() => toggleUniformBaseMaterial(material.id)}
                                class="w-4 h-4 rounded-md border-gray-300 text-primary focus:ring-primary"
                              />
                              <span class="ml-2 text-sm">{material.name}</span>
                            </div>
                            
                            {#if uniformBaseMaterials.has(material.id)}
                              <div class="flex items-center" on:click|stopPropagation>
                                <input
                                  type="number"
                                  name="uniformBaseMaterialQty_{material.id}"
                                  value={uniformBaseMaterialQuantities[material.id] || 0}
                                  on:input={(e) => uniformBaseMaterialQuantities[material.id] = parseFloat(e.target.value) || 0}
                                  class="w-20 text-sm px-2 py-1 border rounded"
                                  min="0"
                                  step="0.01"
                                />
                                <span class="ml-1 text-xs text-gray-500">
                                  {material.unit_of_measurement}
                                </span>
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column - Measurements and Materials -->
              <div class="w-full md:w-2/3 p-4 md:p-6 flex-1 overflow-y-auto">
                <div
                  class="bg-white/80 p-4 md:p-6 rounded-xl border border-primary/10 shadow-sm space-y-4 md:space-y-6"
                >
                  <h3 class="text-base md:text-lg font-semibold text-primary">
                    Measurement Specifications and Materials
                  </h3>
                  
                  <!-- Pricing Formula Visualization -->
                  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                    <p class="text-xs text-blue-800 font-medium mb-2">How pricing and materials work:</p>
                    <div class="flex flex-col gap-1 text-xs">
                      <div class="flex items-center flex-wrap gap-1">
                        <span class="px-2 py-1 bg-primary text-white rounded">Base Price</span>
                        <span>+</span>
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded whitespace-nowrap">(Student's cm - Base cm) × Cost per extra cm</span>
                        <span>=</span>
                        <span class="px-2 py-1 bg-green-100 text-green-800 rounded">Final Price</span>
                      </div>
                      <div class="flex items-center flex-wrap gap-1 mt-1">
                        <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded">Material per cm</span>
                        <span>×</span>
                        <span class="px-2 py-1 bg-amber-100 text-amber-800 rounded whitespace-nowrap">Student's measurement (cm)</span>
                        <span>=</span>
                        <span class="px-2 py-1 bg-emerald-100 text-emerald-800 rounded">Total Materials Used</span>
                      </div>
                    </div>
                  </div>

                  <!-- Selected Measurements -->
                  {#if selectedMeasurements.size > 0}
                    <div>
                      <h4
                        class="text-xs md:text-sm font-medium text-primary/70 mb-3"
                      >
                        Selected Measurements
                      </h4>
                      <div class="space-y-6">
                        {#each measurementTypes as measurementType}
                          {#if selectedMeasurements.has(measurementType.id)}
                            {@const spec = measurementSpecs[measurementType.id] || {
                              base_cm: measurementType.default_base_cm || 0,
                              additional_cost_per_cm: measurementType.default_additional_cost_per_cm || 0,
                              materials: []
                            }}
                            <div class="border border-primary/10 rounded-lg overflow-hidden">
                              <!-- Measurement Header -->
                              <div
                                class="group bg-primary/5 p-3 rounded-t-lg border-b border-primary/20 cursor-pointer"
                                on:click|preventDefault={() => toggleMeasurement(measurementType.id)}
                              >
                                <div class="flex items-center justify-between p-2">
                                  <span class="font-medium text-primary"
                                    >{measurementType.name}</span
                                  >
                                  <input
                                    type="checkbox"
                                    name="selectedMeasurements"
                                    value={measurementType.id}
                                    checked={true}
                                    class="w-4 h-4 rounded-md border-gray-300 text-primary focus:ring-primary pointer-events-none"
                                  />
                                </div>
                              </div>
                              
                              <!-- Measurement Content -->
                              <div class="p-4 bg-white/60">
                                <!-- Measurement Specs (existing) -->
                                <div class="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label class="block text-xs text-gray-600">Base (cm)</label>
                                    <input
                                      type="number"
                                      name="baseCm_{measurementType.id}"
                                      value={spec.base_cm}
                                      class="block w-full px-2 py-1 text-sm rounded-md border border-gray-200 bg-white/50"
                                      min="0"
                                      max="500"
                                      step="0.1"
                                      required
                                      on:input={(e) => {
                                        measurementSpecs[measurementType.id] = {
                                          ...measurementSpecs[measurementType.id],
                                          base_cm: parseFloat(e.target.value)
                                        };
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600">Cost per extra cm (₱)</label>
                                    <input
                                      type="number"
                                      name="costPerCm_{measurementType.id}"
                                      value={spec.additional_cost_per_cm}
                                      class="block w-full px-2 py-1 text-sm rounded-md border border-gray-200 bg-white/50"
                                      min="0"
                                      step="0.01"
                                      required
                                      on:input={(e) => {
                                        measurementSpecs[measurementType.id] = {
                                          ...measurementSpecs[measurementType.id],
                                          additional_cost_per_cm: parseFloat(e.target.value)
                                        };
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                <!-- Materials for this measurement -->
                                <div class="mt-4">
                                  <h5 class="text-xs font-medium text-gray-700 mb-2 flex items-center">
                                    Materials for {measurementType.name} when exceeding standard size
                                    <span class="ml-2 group relative cursor-help">
                                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 w-64 p-2 bg-gray-800 text-white text-xs rounded">
                                        Specify how much material is needed per centimeter of student's measurement beyond the standard size. Total material is calculated by multiplying this value by the student's actual measurement.
                                      </div>
                                    </span>
                                  </h5>
                                  
                                  <!-- Selected materials for this measurement -->
                                  {#if selectedMaterialsByMeasurement[measurementType.id]?.size > 0}
                                    <div class="mb-4 space-y-2">
                                      {#each Array.from(selectedMaterialsByMeasurement[measurementType.id] || []) as materialId}
                                        {@const material = inventoryItems.find(m => m.id === materialId)}
                                        {@const materialSpec = getMaterialsForMeasurement(measurementType.id).find(m => m.material_id === materialId) || { quantity_per_cm: 0 }}
                                        {#if material}
                                          <div class="flex flex-col sm:flex-row sm:items-center bg-blue-50 p-2 rounded-lg border border-blue-100">
                                            <div class="flex-1 flex items-center mb-2 sm:mb-0">
                                              <button
                                                type="button"
                                                class="text-red-500 hover:text-red-700 mr-2"
                                                on:click={() => toggleMaterialForMeasurement(measurementType.id, materialId)}
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                              <span class="text-sm font-medium">{material.name}</span>
                                            </div>
                                            
                                            <div class="flex items-center">
                                              <label class="text-xs text-gray-600 mr-1">Material per cm:</label>
                                              <input
                                                type="number"
                                                name="materialPerCm_{measurementType.id}_{materialId}"
                                                value={materialSpec.quantity_per_cm}
                                                min="0"
                                                step="0.01"
                                                class="w-20 text-xs px-1 py-1 border rounded"
                                                on:input={(e) => updateMaterialQuantity(
                                                  measurementType.id,
                                                  materialId,
                                                  e.target.value
                                                )}
                                              />
                                              <span class="ml-1 text-xs">{material.unit_of_measurement}/cm</span>
                                            </div>
                                          </div>
                                        {/if}
                                      {/each}
                                    </div>
                                  {/if}
                                  
                                  <!-- Add material dropdown -->
                                  <div class="mt-2">
                                    <select 
                                      class="text-sm px-2 py-1 border rounded w-full"
                                      on:change={(e) => {
                                        if (e.target.value) {
                                          toggleMaterialForMeasurement(measurementType.id, parseInt(e.target.value));
                                          e.target.value = "";
                                        }
                                      }}
                                    >
                                      <option value="">+ Add material for this measurement</option>
                                      {#each inventoryItems.filter(m => !selectedMaterialsByMeasurement[measurementType.id]?.has(m.id)) as material}
                                        <option value={material.id}>{material.name} ({material.unit_of_measurement})</option>
                                      {/each}
                                    </select>
                                  </div>
                                  
                                  <!-- Hidden inputs to ensure materials are submitted with form -->
                                  {#each Array.from(selectedMaterialsByMeasurement[measurementType.id] || []) as materialId}
                                    <input type="hidden" name="baseMaterials_{measurementType.id}" value={materialId} />
                                  {/each}
                                </div>
                              </div>
                            </div>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Available Measurements -->
                  <div>
                    <h4
                      class="text-xs md:text-sm font-medium text-gray-500 mb-3"
                    >
                      Available Measurements (Click to add)
                    </h4>
                    <div
                      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
                    >
                      {#each measurementTypes as measurementType}
                        {#if !selectedMeasurements.has(measurementType.id)}
                          <div
                            class="group h-full"
                            on:click|preventDefault={() =>
                              toggleMeasurement(measurementType.id)}
                          >
                            <div
                              class="bg-white/90 p-3 rounded-lg border border-gray-100 hover:border-primary/20 hover:shadow-sm cursor-pointer transition-all duration-200 h-full flex flex-col"
                            >
                              <div
                                class="flex items-center justify-between p-2"
                              >
                                <span
                                  class="font-medium text-gray-600 group-hover:text-primary"
                                  >{measurementType.name}</span
                                >
                                <input
                                  type="checkbox"
                                  name="selectedMeasurements"
                                  value={measurementType.id}
                                  checked={false}
                                  class="w-4 h-4 rounded-md border-gray-300 text-primary focus:ring-primary pointer-events-none"
                                />
                              </div>
                              <div class="mt-2 text-xs text-gray-500">
                                <p>Default base: <span class="font-medium">{measurementType.default_base_cm || 0} cm</span></p>
                                <p>Default cost per cm: <span class="font-medium">₱{measurementType.default_additional_cost_per_cm || 0}</span></p>
                              </div>
                            </div>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>

                  <!-- Add a Material Usage Explainer Section at the bottom -->
                  <div class="mt-8 bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h4 class="text-base font-semibold text-blue-800 mb-3">
                      Material and Cost Calculator
                    </h4>
                    
                    <div class="space-y-4">
                      <!-- Controls for example calculations -->
                      <div class="bg-white/80 rounded-lg p-3 border border-blue-200">
                        <div class="flex flex-col md:flex-row justify-between items-center gap-3 mb-3">
                          <h5 class="text-sm font-medium text-blue-800">Student Measurements:</h5>
                          
                          <div class="flex items-center gap-2">
                            <label class="text-xs font-medium text-blue-700">Add to all base sizes:</label>
                            <input 
                              type="number" 
                              bind:value={exampleAddToAll}
                              on:input={() => {
                                // The calculation is now directly reactive via the $: block above
                              }}
                              min="0" 
                              step="1"
                              class="w-16 text-sm p-1 border rounded bg-white"
                            />
                            <span class="text-xs">cm</span>
                            <button 
                              type="button"
                              class="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                              on:click|preventDefault={resetExampleSizes}
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                        
                        <!-- Student Measurements grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          {#each Array.from(selectedMeasurements) as typeId}
                            {@const measurementType = measurementTypes.find(m => m.id === typeId)}
                            {@const spec = measurementSpecs[typeId] || { base_cm: 0 }}
                            <div class="bg-gray-50 p-2 rounded border border-gray-200">
                              <label class="block text-xs font-medium text-blue-800 mb-1">
                                {measurementType?.name || 'Unknown'} <span class="text-gray-500">(Base: {spec.base_cm} cm)</span>
                              </label>
                              <div class="flex items-center">
                                <input 
                                  type="number" 
                                  bind:value={exampleStudentSize[typeId]}
                                  min="0" 
                                  step="0.5"
                                  class="w-full text-sm p-1 border rounded bg-white"
                                />
                                <span class="ml-1 text-xs">cm</span>
                              </div>
                            </div>
                          {/each}
                        </div>
                        
                        <!-- Results: Materials needed -->
                        <div class="mb-4">
                          <h6 class="text-sm font-medium text-blue-800 mb-2 border-b border-blue-100 pb-1">Materials Breakdown:</h6>
                          
                          <!-- Uniform base materials -->
                          {#if uniformBaseMaterials.size > 0}
                            <div class="mb-3">
                              <h6 class="text-xs font-medium text-blue-700 mb-1">Base Materials for Uniform:</h6>
                              <div class="space-y-1 pl-2">
                                {#each Array.from(uniformBaseMaterials) as materialId}
                                  {@const material = inventoryItems.find(item => item.id === materialId)}
                                  {@const quantity = uniformBaseMaterialQuantities[materialId] || 0}
                                  {#if material && quantity > 0}
                                    <div class="text-xs flex justify-between">
                                      <span>{material.name}:</span>
                                      <span class="font-medium">{quantity} {material.unit_of_measurement}</span>
                                    </div>
                                  {/if}
                                {/each}
                              </div>
                            </div>
                          {/if}
                          
                          <!-- Materials for each measurement -->
                          {#each Array.from(selectedMeasurements) as typeId}
                            {@const measurementType = measurementTypes.find(m => m.id === typeId)}
                            {@const materials = selectedMaterialsByMeasurement[typeId]}
                            
                            {#if materials && materials.size > 0}
                              <div class="mb-2">
                                <h6 class="text-xs font-medium text-blue-700 mb-1">{measurementType?.name || 'Unknown'} Materials:</h6>
                                <div class="space-y-1 pl-2">
                                  {#each Array.from(materials) as materialId}
                                    {@const material = inventoryItems.find(item => item.id === materialId)}
                                    {@const materialSpec = getMaterialsForMeasurement(typeId).find(m => m.material_id === materialId)}
                                    
                                    {#if material && materialSpec}
                                      <div class="text-xs flex justify-between">
                                        <span>{material.name}:</span>
                                        <span class="font-medium">{exampleMaterialTotal(materialSpec, typeId)} {material.unit_of_measurement}</span>
                                      </div>
                                    {/if}
                                  {/each}
                                </div>
                              </div>
                            {/if}
                          {/each}

                          <!-- Total Materials Needed -->
                          <div class="mt-4 pt-2 border-t border-blue-100">
                            <h6 class="text-xs font-medium text-green-700 mb-1">Total Materials Needed:</h6>
                            <div class="space-y-1 pl-2">
                              {#each getAllMaterialsNeeded() as materialItem}
                                <div class="text-xs flex justify-between">
                                  <span>{materialItem.material.name}:</span>
                                  <span class="font-medium text-green-700">{materialItem.quantity.toFixed(2)} {materialItem.material.unit_of_measurement}</span>
                                </div>
                              {/each}
                            </div>
                          </div>
                        </div>
                        
                        <!-- Results: Price Calculation -->
                        <div class="bg-indigo-50 p-2 rounded border border-indigo-100">
                          <h6 class="text-sm font-medium text-indigo-800 mb-2 border-b border-indigo-200 pb-1">Price Calculation:</h6>
                          
                          <div class="space-y-1 mb-2">
                            <div class="flex justify-between text-xs">
                              <span>Base Price:</span>
                              <span class="font-medium">₱{parseFloat(selectedConfig?.base_price || 0).toFixed(2)}</span>
                            </div>
                            
                            {#each Array.from(selectedMeasurements) as typeId}
                              {@const measurementType = measurementTypes.find(m => m.id === typeId)}
                              {@const extraCm = Math.max(0, getExampleDifference(typeId))}
                              {@const spec = measurementSpecs[typeId] || {}}
                              
                              {#if extraCm > 0}
                                <div class="flex justify-between text-xs">
                                  <span>{measurementType?.name || 'Unknown'} (+{extraCm} cm):</span>
                                  <span>₱{calculateMeasurementPrice(typeId)}</span>
                                </div>
                              {/if}
                            {/each}
                          </div>
                          
                          <div class="flex justify-between text-sm font-bold border-t border-indigo-200 pt-1">
                            <span>Total Price:</span>
                            <span class="text-primary">₱{calculateTotalPrice()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div
          class="p-4 md:p-6 border-t border-primary/5 bg-gradient-to-b from-transparent to-white/80"
        >
          <div class="flex justify-end gap-3 md:gap-4">
            <button
              type="button"
              on:click={resetForm}
              class="px-4 md:px-6 py-2 text-sm md:text-base text-gray-600 hover:text-primary font-medium rounded-lg hover:bg-primary/5 transition-all duration-300"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="configForm"
              class="px-6 md:px-8 py-2 text-sm md:text-base bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:scale-105 disabled:opacity-50 font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : selectedConfig ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 class="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
        <p class="mb-4">Are you sure you want to delete this configuration?</p>
        <div class="flex justify-end gap-2">
          <button
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
            on:click={resetDeleteModal}
          >
            Cancel
          </button>
          <form
            method="POST"
            action="?/delete"
            use:enhance={handleDelete}
            class="inline"
          >
            <input type="hidden" name="id" value={configToDelete?.id} />
            <button
              type="submit"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}

  <!-- Error Modal -->
  {#if showErrorModal}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 class="text-xl font-bold mb-4 text-red-600">Error</h2>
        <p class="mb-4">{errorMessage}</p>
        <div class="flex justify-end">
          <button
            class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            on:click={() => (showErrorModal = false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
