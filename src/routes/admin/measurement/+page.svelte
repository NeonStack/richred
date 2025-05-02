<script>
  import { enhance } from "$app/forms";
  import { scale, fade } from "svelte/transition";
  export let data;

  let measurements = data.measurements;
  let searchTerm = "";
  let editingId = null;
  let showCreateModal = false;
  let showDeleteModal = false;
  let showErrorModal = false;
  let errorMessage = "";
  let newMeasurementName = "";
  let isLoading = false;
  let measurementToDelete = null;
  let sortColumn = "created_at";
  let sortDirection = "desc";
  let newMeasurements = [{ name: "", default_base_cm: "0", default_additional_cost_per_cm: "0" }]; // Updated structure

  // Validation constants
  const NAME_MAX_LENGTH = 40;
  const NAME_PATTERN = /^[A-Za-z0-9\s-]+$/;
  const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

  // Validation state
  let validationErrors = Array(newMeasurements.length).fill({});
  let editValidationError = {};

  // Validation functions
  function validateMeasurementName(name, index, isEdit = false) {
    const errors = {};
    if (!name) {
      errors.name = "Measurement name is required";
    } else if (name.length > NAME_MAX_LENGTH) {
      errors.name = `Name must not exceed ${NAME_MAX_LENGTH} characters`;
    } else if (!NAME_PATTERN.test(name)) {
      errors.name =
        "Name can only contain letters, numbers, spaces, and dashes";
    }

    if (isEdit) {
      // Clear previous error for this field if value is now valid
      if (Object.keys(errors).length === 0) {
        const { name: _, ...restErrors } = editValidationError;
        editValidationError = restErrors;
      } else {
        editValidationError = { ...editValidationError, ...errors };
      }
    } else {
      if (Object.keys(errors).length === 0) {
        // If no errors, clear this specific error
        const { name: _, ...restErrors } = validationErrors[index] || {};
        validationErrors[index] = restErrors;
      } else {
        validationErrors[index] = { ...validationErrors[index], ...errors };
      }
      validationErrors = [...validationErrors]; // Trigger reactivity
    }
    return Object.keys(errors).length === 0;
  }

  function validateDecimalField(value, fieldName, index, isEdit = false) {
    const errors = {};
    if (value === null || value === undefined || value === "") {
      errors[fieldName] = `${fieldName === 'default_base_cm' ? 'Default base cm' : 'Default cost per cm'} is required`;
    } else if (!DECIMAL_PATTERN.test(value)) {
      errors[fieldName] = "Must be a valid decimal number (up to 2 decimal places)";
    }

    if (isEdit) {
      // Clear previous error for this field if value is now valid
      if (Object.keys(errors).length === 0) {
        const newErrors = { ...editValidationError };
        delete newErrors[fieldName];
        editValidationError = newErrors;
      } else {
        editValidationError = { ...editValidationError, ...errors };
      }
    } else {
      if (Object.keys(errors).length === 0) {
        // If no errors, clear this specific error
        const newErrors = { ...validationErrors[index] };
        delete newErrors[fieldName];
        validationErrors[index] = newErrors;
      } else {
        validationErrors[index] = { ...validationErrors[index], ...errors };
      }
      validationErrors = [...validationErrors]; // Trigger reactivity
    }
    return Object.keys(errors).length === 0;
  }

  function validateMeasurement(measurement, index, isEdit = false) {
    const nameValid = validateMeasurementName(measurement.name, index, isEdit);
    const baseCmValid = validateDecimalField(measurement.default_base_cm, 'default_base_cm', index, isEdit);
    const costPerCmValid = validateDecimalField(measurement.default_additional_cost_per_cm, 'default_additional_cost_per_cm', index, isEdit);
    return nameValid && baseCmValid && costPerCmValid;
  }

  // Filter and sort measurements
  $: filteredMeasurements = measurements
    ?.filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.usage_count.toString().includes(searchTerm))
    ?.sort((a, b) => {
      let comparison = 0;
      if (sortColumn === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortColumn === "created_at") {
        comparison = new Date(a.created_at) - new Date(b.created_at);
      } else if (sortColumn === "usage_count") {
        comparison = a.usage_count - b.usage_count;
      } else if (sortColumn === "default_base_cm") {
        comparison = parseFloat(a.default_base_cm || 0) - parseFloat(b.default_base_cm || 0);
      } else if (sortColumn === "default_additional_cost_per_cm") {
        comparison = parseFloat(a.default_additional_cost_per_cm || 0) - parseFloat(b.default_additional_cost_per_cm || 0);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  // Add pagination state
  let currentPage = 1;
  let rowsPerPage = 10;

  // Calculate total pages and paginated measurements
  $: totalPages = Math.ceil((filteredMeasurements?.length || 0) / rowsPerPage);
  $: paginatedMeasurements = filteredMeasurements?.slice(
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

  // Reset form states
  const resetForms = () => {
    editingId = null;
    newMeasurementName = "";
    showCreateModal = false;
    showDeleteModal = false;
    showErrorModal = false;
    errorMessage = "";
    isLoading = false;
    measurementToDelete = null;
    newMeasurements = [{ name: "", default_base_cm: "0", default_additional_cost_per_cm: "0" }];
    validationErrors = Array(newMeasurements.length).fill({});
    editValidationError = {};
  };

  // Show error modal
  const showError = (message) => {
    errorMessage = message;
    showErrorModal = true;
    isLoading = false;
  };

  // Function to convert to sentence case and clean whitespace
  const toSentenceCase = (str) => {
    return str
      .toLowerCase()
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim() // Remove leading/trailing spaces
      .replace(/^.|\s\S/g, (letter) => letter.toUpperCase());
  };

  // Handle create submission
  const handleCreateSubmit = () => {
    let isValid = true;
    newMeasurements.forEach((measurement, index) => {
      if (!validateMeasurement(measurement, index)) isValid = false;
    });

    if (!isValid) return () => {}; // Prevent form submission if invalid

    isLoading = true;
    // Format names before submitting
    const formattedMeasurements = newMeasurements.map(measurement => ({
      name: toSentenceCase(measurement.name.trim()),
      default_base_cm: measurement.default_base_cm,
      default_additional_cost_per_cm: measurement.default_additional_cost_per_cm
    })).filter(measurement => measurement.name);

    return async ({ result }) => {
      if (result.type === "success") {
        resetForms();
        window.location.reload();
      } else if (result.type === "failure") {
        showError(result.data?.error || "Failed to create measurements");
      }
      isLoading = false;
    };
  };

  // Handle update submission
  const handleUpdateSubmit = () => {
    const currentMeasurement = measurements.find(m => m.id === editingId);
    if (!validateMeasurement(currentMeasurement, 0, true)) {
      return () => {}; // Prevent form submission if invalid
    }
    
    isLoading = true;
    return async ({ result }) => {
      if (result.type === "success") {
        resetForms();
        window.location.reload();
      } else if (result.type === "failure") {
        showError(result.data?.error || "Failed to update measurement");
      }
      isLoading = false;
    };
  };

  // Handle delete submission
  const handleDeleteSubmit = () => {
    isLoading = true;
    return async ({ result }) => {
      if (result.type === "success") {
        resetForms();
        window.location.reload();
      } else if (result.type === "failure") {
        showError(result.data?.error || "Failed to delete measurement");
      }
      isLoading = false;
    };
  };

  // Confirm delete
  const confirmDelete = (measurement) => {
    measurementToDelete = measurement;
    showDeleteModal = true;
  };

  // Sort function
  const toggleSort = (column) => {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
  };

  const addMeasurementField = () => {
    newMeasurements = [...newMeasurements, { name: "", default_base_cm: "0", default_additional_cost_per_cm: "0" }];
    validationErrors = [...validationErrors, {}];
  };

  const removeMeasurementField = (index) => {
    newMeasurements = newMeasurements.filter((_, i) => i !== index);
    validationErrors = validationErrors.filter((_, i) => i !== index);
  };

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

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
            class="w-6 h-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              fill="currentColor"
              d="M18 1H6v5h3.5v2H6v3h5v2H6v3h3.5v2H6v5h12z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Measurement Types</h1>
          <p class="text-sm text-gray-500">
            Manage and track measurement types
          </p>
        </div>
      </div>
    </div>
    <button
      class="w-full md:w-auto bg-primary text-white px-4 py-2 rounded-lg"
      on:click={() => (showCreateModal = true)}
    >
      Add New Measurement
    </button>
  </div>

  <!-- Main content card -->
  <div class="bg-white p-6 rounded-lg shadow-md">
    <div class="flex flex-col md:flex-row justify-between gap-4 md:gap-0 mb-4">
      <h2 class="text-xl font-semibold">Measurements List</h2>
      <input
        type="text"
        placeholder="Search measurements..."
        bind:value={searchTerm}
        class="w-full md:w-auto border rounded p-2"
      />
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[1000px]">
        <thead>
          <tr class="bg-gray-50">
            <th
              class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
              on:click={() => toggleSort("name")}
            >
              <div class="flex items-center gap-1">
                Name
                {#if sortColumn === "name"}
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
              on:click={() => toggleSort("default_base_cm")}
            >
              <div class="flex items-center gap-1">
                Default Base (cm)
                {#if sortColumn === "default_base_cm"}
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
              on:click={() => toggleSort("default_additional_cost_per_cm")}
            >
              <div class="flex items-center gap-1">
                Default cost per cm
                {#if sortColumn === "default_additional_cost_per_cm"}
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
              on:click={() => toggleSort("usage_count")}
            >
              <div class="flex items-center gap-1">
                Usage Count
                {#if sortColumn === "usage_count"}
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
                {#if sortColumn === "created_at"}
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
            <th class="p-4 text-right font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each paginatedMeasurements || [] as measurement (measurement.id)}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="p-4">
                {#if editingId === measurement.id}
                  <form
                    method="POST"
                    action="?/update"
                    use:enhance={handleUpdateSubmit}
                    class="flex gap-2 flex-col items-start"
                  >
                    <input type="hidden" name="id" value={measurement.id} />
                    <div class="w-full">
                      <input
                        type="text"
                        name="name"
                        bind:value={measurement.name}
                        on:input={(e) =>
                          validateMeasurementName(e.target.value, 0, true)}
                        on:blur={(e) => {
                          measurement.name = toSentenceCase(e.target.value);
                          validateMeasurementName(measurement.name, 0, true);
                        }}
                        class="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none {editValidationError?.name
                          ? 'border-red-500'
                          : ''}"
                        maxlength={NAME_MAX_LENGTH}
                        disabled={isLoading}
                      />
                      {#if editValidationError?.name}
                        <p class="text-red-500 text-sm mt-1">
                          {editValidationError.name}
                        </p>
                      {/if}
                    </div>
                    
                    <div class="w-full grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          name="default_base_cm"
                          bind:value={measurement.default_base_cm}
                          on:input={(e) =>
                            validateDecimalField(e.target.value, 'default_base_cm', 0, true)}
                          class="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none {editValidationError?.default_base_cm
                            ? 'border-red-500'
                            : ''}"
                          disabled={isLoading}
                          placeholder="Base cm"
                        />
                        {#if editValidationError?.default_base_cm}
                          <p class="text-red-500 text-sm mt-1">
                            {editValidationError.default_base_cm}
                          </p>
                        {/if}
                      </div>
                      
                      <div>
                        <input
                          type="text"
                          name="default_additional_cost_per_cm"
                          bind:value={measurement.default_additional_cost_per_cm}
                          on:input={(e) =>
                            validateDecimalField(e.target.value, 'default_additional_cost_per_cm', 0, true)}
                          class="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none {editValidationError?.default_additional_cost_per_cm
                            ? 'border-red-500'
                            : ''}"
                          disabled={isLoading}
                          placeholder="Default cost per cm"
                        />
                        {#if editValidationError?.default_additional_cost_per_cm}
                          <p class="text-red-500 text-sm mt-1">
                            {editValidationError.default_additional_cost_per_cm}
                          </p>
                        {/if}
                      </div>
                    </div>
                    
                    <div class="flex gap-2">
                      <button
                        type="submit"
                        class="text-blue-600 hover:text-blue-800"
                        disabled={isLoading}>Save</button
                      >
                      <button
                        type="button"
                        on:click={resetForms}
                        class="text-gray-600"
                        disabled={isLoading}>Cancel</button
                      >
                    </div>
                  </form>
                {:else}
                  <span
                    class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {measurement.name}
                  </span>
                {/if}
              </td>
              <td class="p-4">
                {#if editingId !== measurement.id}
                  <span class="text-gray-800">
                    {measurement.default_base_cm ?? 0}
                  </span>
                {/if}
              </td>
              <td class="p-4">
                {#if editingId !== measurement.id}
                  <span class="text-gray-800">
                    {measurement.default_additional_cost_per_cm ?? 0}
                  </span>
                {/if}
              </td>
              <td class="p-4">
                <span
                  class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                >
                  {measurement.usage_count}
                  {measurement.usage_count === 1 ? "use" : "uses"}
                </span>
              </td>
              <td class="p-4"
                >{formatDate(measurement.created_at)}</td
              >
              <td class="p-4 text-right">
                {#if editingId !== measurement.id}
                  <button
                    class="text-blue-600 hover:text-blue-800 mr-2"
                    on:click={() => (editingId = measurement.id)}
                    disabled={isLoading}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:text-red-800"
                    on:click={() => confirmDelete(measurement)}
                    disabled={isLoading}
                  >
                    Delete
                  </button>
                {/if}
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="6" class="py-8 text-center text-gray-500">
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
                  <p class="text-lg font-medium">No measurements found</p>
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
            filteredMeasurements?.length || 0
          )} of {filteredMeasurements?.length || 0} entries
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
</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="bg-white rounded-xl w-full max-w-md max-h-[80vh] transform transition-all overflow-hidden"
      in:scale={{ duration: 200, start: 0.95 }}
      out:scale={{ duration: 200, start: 1 }}
    >
      <!-- Header Section -->
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center gap-4">
          <div class="bg-primary/10 p-3 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 6h12M6 12h12m-12 6h12"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800">Add New Measurement</h2>
            <p class="text-sm text-gray-500">
              Enter the measurement type details
            </p>
          </div>
        </div>
      </div>

      <!-- Form Section -->
      <form
        method="POST"
        action="?/create"
        use:enhance={handleCreateSubmit}
        class="flex flex-col max-h-[calc(80vh-200px)]"
      >
        <div class="p-6 space-y-6 overflow-y-auto flex-1">
          <div class="space-y-4">
            {#each newMeasurements as measurement, index}
              <div class="border p-4 rounded-lg bg-gray-50">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="font-medium">Measurement {index + 1}</h3>
                  {#if index > 0}
                    <button
                      type="button"
                      class="text-red-600 hover:text-red-800"
                      on:click={() => removeMeasurementField(index)}
                    >
                      <p class="font-bold">Remove</p>
                    </button>
                  {/if}
                </div>
                
                <div class="space-y-4">
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 mb-2"
                      for="name_{index}"
                    >
                      Measurement Name
                    </label>
                    <input
                      type="text"
                      id="name_{index}"
                      name="names"
                      bind:value={newMeasurements[index].name}
                      on:input={() =>
                        validateMeasurementName(newMeasurements[index].name, index)}
                      on:blur={(e) => {
                        newMeasurements[index].name = toSentenceCase(e.target.value);
                        validateMeasurementName(newMeasurements[index].name, index);
                      }}
                      class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none {validationErrors[
                        index
                      ]?.name
                        ? 'border-red-500'
                        : ''}"
                      placeholder="Enter measurement name"
                      maxlength={NAME_MAX_LENGTH}
                      disabled={isLoading}
                      required
                    />
                    {#if validationErrors[index]?.name}
                      <p class="text-red-500 text-sm mt-1">
                        {validationErrors[index].name}
                      </p>
                    {/if}
                    <p class="text-gray-500 text-sm mt-1">
                      {newMeasurements[index].name?.length || 0}/{NAME_MAX_LENGTH} characters
                    </p>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        for="base_cm_{index}"
                      >
                        Default Base (cm)
                      </label>
                      <input
                        type="text"
                        id="base_cm_{index}"
                        name="default_base_cms"
                        bind:value={newMeasurements[index].default_base_cm}
                        on:input={(e) => validateDecimalField(e.target.value, 'default_base_cm', index)}
                        class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none {validationErrors[
                          index
                        ]?.default_base_cm
                          ? 'border-red-500'
                          : ''}"
                        placeholder="0"
                        disabled={isLoading}
                        required
                      />
                      {#if validationErrors[index]?.default_base_cm}
                        <p class="text-red-500 text-sm mt-1">
                          {validationErrors[index].default_base_cm}
                        </p>
                      {/if}
                    </div>
                    
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        for="cost_per_cm_{index}"
                      >
                        Default cost per cm
                      </label>
                      <input
                        type="text"
                        id="cost_per_cm_{index}"
                        name="default_additional_cost_per_cms"
                        bind:value={newMeasurements[index].default_additional_cost_per_cm}
                        on:input={(e) => validateDecimalField(e.target.value, 'default_additional_cost_per_cm', index)}
                        class="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none {validationErrors[
                          index
                        ]?.default_additional_cost_per_cm
                          ? 'border-red-500'
                          : ''}"
                        placeholder="0"
                        disabled={isLoading}
                        required
                      />
                      {#if validationErrors[index]?.default_additional_cost_per_cm}
                        <p class="text-red-500 text-sm mt-1">
                          {validationErrors[index].default_additional_cost_per_cm}
                        </p>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}

            <button
              type="button"
              class="text-primary hover:text-primary-dark flex items-center gap-2"
              on:click={addMeasurementField}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clip-rule="evenodd"
                />
              </svg>
              Add Another Measurement
            </button>
          </div>
        </div>

        <!-- Actions Section -->
        <div class="p-6 border-t border-gray-100 bg-white">
          <div
            class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100"
          >
            <button
              type="button"
              class="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-200 font-medium"
              on:click={resetForms}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 font-medium flex items-center gap-2"
              disabled={isLoading}
            >
              {#if isLoading}
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              {/if}
              {isLoading ? "Creating..." : "Create Measurement"}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && measurementToDelete}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="bg-white rounded-xl w-full max-w-md transform transition-all"
      in:scale={{ duration: 200, start: 0.95 }}
      out:scale={{ duration: 200, start: 1 }}
    >
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center gap-4">
          <div class="bg-red-100 p-3 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800">Confirm Delete</h2>
            <p class="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <p class="mb-4">
          Are you sure you want to delete "{measurementToDelete.name}"?
        </p>
        <form method="POST" action="?/delete" use:enhance={handleDeleteSubmit}>
          <input type="hidden" name="id" value={measurementToDelete.id} />
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-200 font-medium"
              on:click={resetForms}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 font-medium flex items-center gap-2"
              disabled={isLoading}
            >
              {#if isLoading}
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              {/if}
              {isLoading ? "Deleting..." : "Delete Measurement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Error Modal -->
{#if showErrorModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="bg-white rounded-xl w-full max-w-md transform transition-all"
      in:scale={{ duration: 200, start: 0.95 }}
      out:scale={{ duration: 200, start: 1 }}
    >
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center gap-4">
          <div class="bg-red-100 p-3 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800">Error</h2>
            <p class="text-sm text-red-600">{errorMessage}</p>
          </div>
        </div>
      </div>
      <div class="p-6 flex justify-end">
        <button
          class="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200"
          on:click={() => (showErrorModal = false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
