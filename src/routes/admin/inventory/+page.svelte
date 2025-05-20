<script>
  import { enhance } from "$app/forms";
  import { invalidate } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  export let data;

  let inventoryItems = data.inventoryItems || [];
  let recentTransactions = data.recentTransactions || [];
  let selectedItem = null;
  let showItemForm = false;
  let showStockForm = false;
  let isLoading = false;
  let showErrorModal = false;
  let errorMessage = "";
  let searchTerm = "";
  let showDeleteModal = false;
  let itemToDelete = null;

  // Tab management
  let activeTab = "inventory";
  
  // Initialize tab from URL parameter
  onMount(() => {
    const tabParam = $page.url.searchParams.get("tab");
    if (tabParam === "transactions") {
      activeTab = "transactions";
    }
  });

  // Change tab and update URL
  function setActiveTab(tab) {
    activeTab = tab;
    const url = new URL(window.location);
    if (tab === "transactions") {
      url.searchParams.set("tab", "transactions");
    } else {
      url.searchParams.delete("tab");
    }
    history.replaceState({}, "", url);
  }

  let sortField = "name";
  let sortDirection = "asc";

  $: filteredItems = inventoryItems
    ?.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit_of_measurement?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.quantity_available?.toString().includes(searchTerm) ||
        item.cost_per_unit?.toString().includes(searchTerm)
    )
    ?.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

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
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function resetItemForm() {
    selectedItem = null;
    showItemForm = false;
    isLoading = false;
  }

  function resetStockForm() {
    showStockForm = false;
    isLoading = false;
  }

  function showError(message) {
    errorMessage = message;
    showErrorModal = true;
    isLoading = false;
  }

  function resetDeleteModal() {
    showDeleteModal = false;
    itemToDelete = null;
  }

  const handleItemSubmit = () => {
    isLoading = true;
    return async ({ result }) => {
      isLoading = false;
      
      if (result.type === 'success') {
        resetItemForm();
        await invalidate('app:inventory');
        window.location.reload(); // Force reload to ensure fresh data
      } else if (result.type === 'error') {
        showError(result.data?.error || "Operation failed");
      }
    };
  };

  const handleStockSubmit = () => {
    isLoading = true;
    return async ({ result }) => {
      isLoading = false;
      
      if (result.type === 'success') {
        resetStockForm();
        await invalidate('app:inventory');
        window.location.reload(); // Force reload to ensure fresh data
      } else if (result.type === 'error') {
        showError(result.data?.error || "Operation failed");
      }
    };
  };

  const handleDelete = () => {
    isLoading = true;
    return async ({ result }) => {
      isLoading = false;
      resetDeleteModal();

      if (result.type === 'success') {
        await invalidate('app:inventory');
        window.location.reload();
      } else if (result.type === 'error') {
        showError(result.data?.error || "Delete operation failed");
      }
    };
  };

  // For stock update form
  let transactionType = 'stock_in';
  let transactionQuantity = 0;
  let transactionNotes = '';

  // Add pagination state
  let currentPage = 1;
  let rowsPerPage = 10;
  let currentTransactionPage = 1;
  let transactionsPerPage = 10;

  // Calculate total pages and paginated items
  $: totalPages = Math.ceil((filteredItems?.length || 0) / rowsPerPage);
  $: paginatedItems = filteredItems?.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  
  $: totalTransactionPages = Math.ceil((recentTransactions?.length || 0) / transactionsPerPage);
  $: paginatedTransactions = recentTransactions?.slice(
    (currentTransactionPage - 1) * transactionsPerPage,
    currentTransactionPage * transactionsPerPage
  );

  // Navigation functions
  function nextPage(isTransaction = false) {
    if (isTransaction) {
      if (currentTransactionPage < totalTransactionPages) currentTransactionPage++;
    } else {
      if (currentPage < totalPages) currentPage++;
    }
  }

  function prevPage(isTransaction = false) {
    if (isTransaction) {
      if (currentTransactionPage > 1) currentTransactionPage--;
    } else {
      if (currentPage > 1) currentPage--;
    }
  }

  function goToPage(page, isTransaction = false) {
    if (isTransaction) {
      currentTransactionPage = page;
    } else {
      currentPage = page;
    }
  }

  // Reset to first page when filters change
  $: if (searchTerm) {
    currentPage = 1;
  }

  // Generate page numbers for pagination
  $: pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => {
      if (totalPages <= 5) return i + 1;
      if (currentPage <= 3) return i + 1;
      if (currentPage >= totalPages - 2) return totalPages - 4 + i;
      return currentPage - 2 + i;
    }
  );
  
  $: transactionPageNumbers = Array.from(
    { length: Math.min(5, totalTransactionPages) },
    (_, i) => {
      if (totalTransactionPages <= 5) return i + 1;
      if (currentTransactionPage <= 3) return i + 1;
      if (currentTransactionPage >= totalTransactionPages - 2) return totalTransactionPages - 4 + i;
      return currentTransactionPage - 2 + i;
    }
  );

  // Helper function to get transaction type badge class
  function getTransactionBadgeClass(type) {
    switch (type) {
      case 'stock_in':
        return 'bg-green-100 text-green-800';
      case 'stock_out':
        return 'bg-red-100 text-red-800';
      case 'adjustment':
        return 'bg-blue-100 text-blue-800';
      case 'reservation':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Format stock status
  function getStockStatusClass(item) {
    if (item.quantity_available <= 0) {
      return 'bg-red-100 text-red-800';
    } else if (item.quantity_available <= item.minimum_stock_level) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  }
  
  function getStockStatusText(item) {
    if (item.quantity_available <= 0) {
      return 'Out of Stock';
    } else if (item.quantity_available <= item.minimum_stock_level) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  }
</script>

<div class="p-6">
  <!-- Header Section -->
  <div class="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 mb-6">
    <div class="flex items-center gap-4">
      <div class="bg-primary/10 p-3 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="text-primary w-6 h-6" viewBox="0 0 24 24">
          <path fill="currentColor" d="M20 4L4 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zm-1 14H5V6h14v12z"/>
          <path fill="currentColor" d="M12 8H8v4h4V8zm2 0v4h2V8h-2zm-6 6v2h10v-2H8z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Inventory Management</h1>
        <p class="text-sm text-gray-500">Manage materials and stock levels</p>
      </div>
    </div>
    <button
      on:click={() => {
        selectedItem = null;
        showItemForm = true;
      }}
      class="w-full md:w-auto bg-primary text-white px-4 py-2 rounded-lg"
      disabled={isLoading}
    >
      Add New Material
    </button>
  </div>

  <!-- Main content area with tabs -->
  <div class="bg-white rounded-lg shadow-md">
    <div class="flex border-b border-gray-200">
      <button
        class="px-4 py-2 border-b-2 {activeTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-primary'} font-medium"
        on:click={() => setActiveTab('inventory')}
      >
        Inventory Items
      </button>
      <button
        class="px-4 py-2 border-b-2 {activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-primary'} font-medium"
        on:click={() => setActiveTab('transactions')}
      >
        Recent Transactions
      </button>
    </div>

    <!-- Inventory Items List -->
    <div class="p-6" class:hidden={activeTab !== 'inventory'}>
      <div class="flex flex-col md:flex-row justify-between gap-4 md:gap-0 mb-4">
        <h2 class="text-xl font-semibold">Materials List</h2>
        <input
          type="text"
          placeholder="Search materials..."
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
                on:click={() => toggleSort("name")}
              >
                <div class="flex items-center gap-1">
                  Material Name
                  {#if sortField === "name"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 {sortDirection === 'asc' ? 'transform rotate-180' : ''}"
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
              <th class="p-4 text-left font-semibold text-gray-600">
                Description
              </th>
              <th
                class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                on:click={() => toggleSort("quantity_available")}
              >
                <div class="flex items-center gap-1">
                  Quantity
                  {#if sortField === "quantity_available"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 {sortDirection === 'asc' ? 'transform rotate-180' : ''}"
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
              <th class="p-4 text-left font-semibold text-gray-600">
                Unit
              </th>
              <th
                class="p-4 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                on:click={() => toggleSort("cost_per_unit")}
              >
                <div class="flex items-center gap-1">
                  Cost
                  {#if sortField === "cost_per_unit"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 {sortDirection === 'asc' ? 'transform rotate-180' : ''}"
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
              <th class="p-4 text-left font-semibold text-gray-600">
                Status
              </th>
              <th class="p-4 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each paginatedItems || [] as item (item.id)}
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-4 font-medium">{item.name}</td>
                <td class="p-4 text-gray-600">{item.description || "-"}</td>
                <td class="p-4">{item.quantity_available.toFixed(2)}</td>
                <td class="p-4">{item.unit_of_measurement}</td>
                <td class="p-4">₱{item.cost_per_unit.toFixed(2)}</td>
                <td class="p-4">
                  <span class="px-2 py-1 rounded-full text-xs {getStockStatusClass(item)}">
                    {getStockStatusText(item)}
                  </span>
                </td>
                <td class="p-4 text-right">
                  <button
                    class="text-blue-600 hover:text-blue-800 mr-2"
                    on:click={() => {
                      selectedItem = item;
                      showItemForm = true;
                    }}
                  >
                    Edit
                  </button>
                  <button
                    class="text-green-600 hover:text-green-800 mr-2"
                    on:click={() => {
                      selectedItem = item;
                      showStockForm = true;
                      transactionType = 'stock_in';
                      transactionQuantity = 0;
                      transactionNotes = '';
                    }}
                  >
                    Stock
                  </button>
                  <button
                    class="text-red-600 hover:text-red-800"
                    on:click={() => {
                      itemToDelete = item;
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
                    <p class="text-lg font-medium">No inventory items found</p>
                    <p class="text-sm">Try adjusting your search or add new materials</p>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        <!-- Pagination Controls -->
        <div class="flex items-center justify-between px-4 py-3 border-t">
          <div class="flex items-center text-sm text-gray-500">
            Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(
              currentPage * rowsPerPage,
              filteredItems?.length || 0
            )} of {filteredItems?.length || 0} entries
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1 rounded border {currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-50'}"
              on:click={() => prevPage(false)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {#each pageNumbers as pageNum}
              <button
                class="px-3 py-1 rounded border {currentPage === pageNum
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-50'}"
                on:click={() => goToPage(pageNum, false)}
              >
                {pageNum}
              </button>
            {/each}

            <button
              class="px-3 py-1 rounded border {currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-50'}"
              on:click={() => nextPage(false)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="p-6 {activeTab === 'inventory' ? 'border-t border-gray-200 hidden' : ''}" class:hidden={activeTab !== 'transactions'}>
      <h2 class="text-xl font-semibold mb-4">Recent Transactions</h2>
      
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px]">
          <thead>
            <tr class="bg-gray-50">
              <th class="p-3 text-left font-semibold text-gray-600">Date</th>
              <th class="p-3 text-left font-semibold text-gray-600">Material</th>
              <th class="p-3 text-left font-semibold text-gray-600">Type</th>
              <th class="p-3 text-left font-semibold text-gray-600">Quantity</th>
              <th class="p-3 text-left font-semibold text-gray-600">Notes</th>
              <th class="p-3 text-left font-semibold text-gray-600">Created By</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each paginatedTransactions || [] as transaction (transaction.id)}
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-3 text-sm">{formatDate(transaction.transaction_date)}</td>
                <td class="p-3 font-medium">{transaction.inventory_items?.name || 'Unknown'}</td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded-full text-xs {getTransactionBadgeClass(transaction.transaction_type)}">
                    {transaction.transaction_type.replace('_', ' ')}
                  </span>
                </td>
                <td class="p-3">
                  {transaction.transaction_type === 'stock_out' ? '-' : '+'}{transaction.quantity.toFixed(2)}
                </td>
                <td class="p-3 text-gray-600">{transaction.notes || "-"}</td>
                <td class="p-3 text-sm">{transaction.created_by || "system"}</td>
              </tr>
            {:else}
              <tr>
                <td colspan="6" class="py-6 text-center text-gray-500">
                  No recent transactions found
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        
        <!-- Transactions Pagination -->
        <div class="flex items-center justify-between px-4 py-3 border-t">
          <div class="flex items-center text-sm text-gray-500">
            Showing {(currentTransactionPage - 1) * transactionsPerPage + 1} to {Math.min(
              currentTransactionPage * transactionsPerPage,
              recentTransactions?.length || 0
            )} of {recentTransactions?.length || 0} transactions
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1 rounded border {currentTransactionPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-50'}"
              on:click={() => prevPage(true)}
              disabled={currentTransactionPage === 1}
            >
              Previous
            </button>

            {#each transactionPageNumbers as pageNum}
              <button
                class="px-3 py-1 rounded border {currentTransactionPage === pageNum
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-50'}"
                on:click={() => goToPage(pageNum, true)}
              >
                {pageNum}
              </button>
            {/each}

            <button
              class="px-3 py-1 rounded border {currentTransactionPage === totalTransactionPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-50'}"
              on:click={() => nextPage(true)}
              disabled={currentTransactionPage === totalTransactionPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Item Form Modal -->
  {#if showItemForm}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <!-- Modal Header -->
        <div class="p-6 bg-gradient-to-r from-primary to-primary-dark border-b">
          <h2 class="text-2xl font-bold text-white">
            {selectedItem ? "Edit Material" : "Add New Material"}
          </h2>
          <p class="text-sm text-white/80 mt-1">
            {selectedItem ? "Update material information" : "Add a new material to inventory"}
          </p>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <form
            id="itemForm"
            method="POST"
            action={selectedItem ? "?/updateItem" : "?/createItem"}
            use:enhance={handleItemSubmit}
            class="space-y-4"
          >
            {#if selectedItem}
              <input type="hidden" name="id" value={selectedItem.id} />
            {/if}

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="name">
                Material Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={selectedItem?.name || ""}
                class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="description">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows="2"
                class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >{selectedItem?.description || ""}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="unitOfMeasurement">
                  Unit of Measurement
                </label>
                <select
                  name="unitOfMeasurement"
                  id="unitOfMeasurement"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="" disabled selected={!selectedItem?.unit_of_measurement}>Select Unit</option>
                  <option value="cm" selected={selectedItem?.unit_of_measurement === "cm"}>Centimeter (cm)</option>
                  <option value="m" selected={selectedItem?.unit_of_measurement === "m"}>Meter (m)</option>
                  <option value="piece" selected={selectedItem?.unit_of_measurement === "piece"}>Piece</option>
                  <option value="roll" selected={selectedItem?.unit_of_measurement === "roll"}>Roll</option>
                  <option value="yard" selected={selectedItem?.unit_of_measurement === "yard"}>Yard</option>
                  <option value="kg" selected={selectedItem?.unit_of_measurement === "kg"}>Kilogram (kg)</option>
                  <option value="g" selected={selectedItem?.unit_of_measurement === "g"}>Gram (g)</option>
                  <option value="box" selected={selectedItem?.unit_of_measurement === "box"}>Box</option>
                  <option value="pack" selected={selectedItem?.unit_of_measurement === "pack"}>Pack</option>
                </select>
              </div>

              {#if !selectedItem}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="quantityAvailable">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    name="quantityAvailable"
                    id="quantityAvailable"
                    value={selectedItem?.quantity_available || "0"}
                    min="0"
                    step="0.01"
                    class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              {/if}
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="minimumStockLevel">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  name="minimumStockLevel"
                  id="minimumStockLevel"
                  value={selectedItem?.minimum_stock_level || "0"}
                  min="0"
                  step="0.01"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="costPerUnit">
                  Cost Per Unit (₱)
                </label>
                <input
                  type="number"
                  name="costPerUnit"
                  id="costPerUnit"
                  value={selectedItem?.cost_per_unit || "0"}
                  min="0"
                  step="0.01"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="p-6 border-t flex justify-end gap-3">
          <button
            type="button"
            on:click={resetItemForm}
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="itemForm"
            class="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : selectedItem ? "Update Material" : "Add Material"}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Stock Update Modal -->
  {#if showStockForm && selectedItem}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <!-- Modal Header -->
        <div class="p-6 bg-gradient-to-r from-primary to-primary-dark border-b">
          <h2 class="text-2xl font-bold text-white">
            Update Stock
          </h2>
          <p class="text-sm text-white/80 mt-1">
            {selectedItem.name} - Current Stock: {selectedItem.quantity_available.toFixed(2)} {selectedItem.unit_of_measurement}
          </p>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <form
            id="stockForm"
            method="POST"
            action="?/updateQuantity"
            use:enhance={handleStockSubmit}
            class="space-y-4"
          >
            <input type="hidden" name="id" value={selectedItem.id} />
            <input type="hidden" name="createdBy" value="admin" />

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="transactionType">
                Transaction Type
              </label>
              <select
                name="transactionType"
                id="transactionType"
                bind:value={transactionType}
                class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="stock_in">Stock In</option>
                <option value="stock_out">Stock Out</option>
                <option value="adjustment">Direct Adjustment</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="quantity">
                {transactionType === 'adjustment' ? 'New Quantity' : 'Quantity'}
              </label>
              <input
                type="number"
                name="quantity"
                id="quantity"
                bind:value={transactionQuantity}
                min="0"
                step="0.01"
                class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              {#if transactionType === 'adjustment'}
                <p class="text-xs text-gray-500 mt-1">
                  This will set the total quantity to exactly this value.
                </p>
              {/if}
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="notes">
                Notes
              </label>
              <textarea
                name="notes"
                id="notes"
                bind:value={transactionNotes}
                rows="2"
                class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              ></textarea>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="p-6 border-t flex justify-end gap-3">
          <button
            type="button"
            on:click={resetStockForm}
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="stockForm"
            class="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Stock"}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div class="p-6">
          <h2 class="text-xl font-bold text-red-600 mb-4">Confirm Delete</h2>
          <p class="mb-6">
            Are you sure you want to delete <span class="font-medium">{itemToDelete?.name}</span>? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              on:click={resetDeleteModal}
              disabled={isLoading}
            >
              Cancel
            </button>
            <form
              method="POST"
              action="?/deleteItem"
              use:enhance={handleDelete}
              class="inline"
            >
              <input type="hidden" name="id" value={itemToDelete?.id} />
              <button
                type="submit"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Error Modal -->
  {#if showErrorModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div class="p-6">
          <h2 class="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p class="mb-6">{errorMessage}</p>
          <div class="flex justify-end">
            <button
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              on:click={() => (showErrorModal = false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
