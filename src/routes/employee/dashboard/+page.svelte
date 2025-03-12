<script>
  export let data;
  const { orders, stats, ordersByCourse } = data;

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  const oneWeekDate = oneWeekFromNow.toISOString().split("T")[0];

  const dueToday = orders.filter(
    (order) => order.due_date === today && order.status === "in progress"
  );
  const dueThisWeek = orders.filter(
    (order) =>
      order.due_date <= oneWeekDate &&
      order.due_date > today &&
      order.status === "in progress"
  );
  const inProgressOrders = orders.filter(
    (order) => order.status === "in progress"
  );

  const dueInSevenDays = orders.filter(
    order => order.due_date <= oneWeekDate && 
            order.due_date >= today && 
            order.status === 'in progress'
  ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Calculate days until due date
  function getDaysUntilDue(dueDate) {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) {
      const overdueDays = Math.abs(days);
      return `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`;
    }
    return days === 0 ? 'Due today' : days === 1 ? '1 day left' : `${days} days left`;
  }

  // Get urgency class based on days until due
  function getUrgencyClass(dueDate) {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'bg-red-100 text-red-800 border-red-200';
    if (days <= 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }

  // Add new helper function for completion status
  function getCompletionStatus(dueDate, updatedAt) {
    const completionDate = new Date(updatedAt);
    const dueDateTime = new Date(dueDate);
    return completionDate <= dueDateTime ? 'Completed in Time' : 'Completed Late';
  }

  // Get status class based on completion
  function getCompletionClass(dueDate, updatedAt) {
    return getCompletionStatus(dueDate, updatedAt) === 'Completed in Time' 
      ? 'bg-emerald-100 text-emerald-800' 
      : 'bg-orange-100 text-orange-800';
  }

  // Modal state
  let showModal = false;
  let modalTitle = '';
  let modalOrders = [];

  function openModal(title, filterFn) {
    modalTitle = title;
    modalOrders = orders.filter(filterFn).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  import { scale, fade } from "svelte/transition";
</script>

<div class="p-6 md:p-8 min-h-screen">
  <!-- Header - with improved spacing and more prominent styling -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div class="bg-primary/10 p-4 rounded-lg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-7 h-7 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </div>
    <div>
      <h1 class="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
      <p class="text-sm text-gray-500 mt-1">
        Last updated: {new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}
      </p>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
    <div 
      class="bg-purple-100 p-6 rounded-xl border-2 border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors"
      on:click={() => openModal('Overdue Orders', o => o.due_date < today && o.status === 'in progress')}
    >
      <h3 class="text-sm font-medium text-purple-900 mb-1">Overdue</h3>
      <p class="text-2xl font-bold text-purple-800">{stats.overdue}</p>
      <p class="text-xs text-purple-700 mt-1">Past Due Date</p>
    </div>

    <div 
      class="bg-red-100 p-6 rounded-xl border-2 border-red-200 cursor-pointer hover:bg-red-50 transition-colors"
      on:click={() => openModal('Due Today', o => o.due_date === today && o.status === 'in progress')}
    >
      <h3 class="text-sm font-medium text-red-900 mb-1">Due Today</h3>
      <p class="text-2xl font-bold text-red-800">{stats.dueToday}</p>
      <p class="text-xs text-red-700 mt-1">Critical Priority</p>
    </div>

    <div 
      class="bg-amber-100 p-6 rounded-xl border-2 border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
      on:click={() => openModal('Due in 7 Days', o => o.due_date <= oneWeekDate && o.due_date >= today && o.status === 'in progress')}
    >
      <h3 class="text-sm font-medium text-amber-900 mb-1">Due in 7 Days</h3>
      <p class="text-2xl font-bold text-amber-800">{stats.dueInSevenDays}</p>
      <p class="text-xs text-amber-700 mt-1">High Priority</p>
    </div>

    <div 
      class="bg-blue-100 p-6 rounded-xl border-2 border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
      on:click={() => openModal('In Progress Orders', o => o.status === 'in progress')}
    >
      <h3 class="text-sm font-medium text-blue-900 mb-1">In Progress</h3>
      <p class="text-2xl font-bold text-blue-800">{stats.total}</p>
      <p class="text-xs text-blue-700 mt-1">Active Orders</p>
    </div>

    <div 
      class="bg-emerald-100 p-6 rounded-xl border-2 border-emerald-200 cursor-pointer hover:bg-emerald-50 transition-colors"
      on:click={() => openModal('Completed Orders', o => o.status === 'completed' && o.updated_at.startsWith(new Date().toISOString().slice(0, 7)))}
    >
      <h3 class="text-sm font-medium text-emerald-900 mb-1">Completed</h3>
      <p class="text-2xl font-bold text-emerald-800">
        {stats.completedThisMonth}
      </p>
      <p class="text-xs text-emerald-700 mt-1">This Month</p>
    </div>
  </div>

  <!-- Orders by Course -->
  <!-- Orders by Course - with improved card design -->
<div class="mb-8">
  <div class="flex justify-between items-center mb-5">
    <h2 class="text-xl font-semibold text-gray-800">Orders by Course</h2>
    <a href="/employee/orders" class="flex items-center gap-1 text-primary hover:underline font-medium">
      View All Orders
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  </div>
  
  {#if Object.entries(ordersByCourse).some(([_, courseOrders]) => courseOrders.some(order => order.status === "in progress"))}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {#each Object.entries(ordersByCourse) as [courseCode, courseOrders]}
        {#if courseOrders.some((order) => order.status === "in progress")}
          <div
            class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
          >
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div class="flex items-center gap-2">
                <div class="bg-blue-100 p-2 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 14l9-5-9-5-9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold">{courseCode}</h3>
              </div>
              <span class="text-sm bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                {courseOrders.filter((o) => o.status === "in progress").length} active
              </span>
            </div>
            <div class="space-y-3">
              {#each courseOrders.filter((order) => order.status === "in progress")
                .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                .slice(0, 3) as order}
                <!-- Improved order item design -->
                <div class="p-3 rounded-lg border {getUrgencyClass(order.due_date)} hover:shadow-sm transition-all">
                  <div class="flex justify-between items-start gap-4">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-medium">#{order.id}</span>
                        <span class="text-xs px-1.5 py-0.5 rounded-full bg-white bg-opacity-60">{getDaysUntilDue(order.due_date)}</span>
                      </div>
                      <p class="text-sm mt-1 font-medium">{order.students.first_name} {order.students.last_name}</p>
                      <p class="text-xs mt-1 opacity-75">{order.uniform_type}</p>
                    </div>
                    <div class="text-xs whitespace-nowrap font-medium">
                      {formatDate(order.due_date)}
                    </div>
                  </div>
                </div>
              {/each}
              
              <!-- View all button with improved styling -->
              {#if courseOrders.filter((order) => order.status === "in progress").length > 3}
                <button 
                  class="w-full text-center text-primary text-sm py-2.5 border border-primary/20 rounded-lg hover:bg-primary/5 transition-all mt-2"
                  on:click={() => openModal(`${courseCode} Orders`, o => o.students?.course?.course_code === courseCode && o.status === 'in progress')}
                >
                  View all {courseOrders.filter((o) => o.status === "in progress").length} orders
                </button>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
      <div class="bg-gray-100 p-4 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-800 mb-2">No assigned orders</h3>
      <p class="text-gray-500 text-center">There are currently no active orders assigned to any courses.</p>
    </div>
  {/if}
</div>
</div>

<!-- Modal Component with improved design -->
{#if showModal}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
  >
    <div 
      class="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
      in:scale={{ duration: 200, start: 0.95 }}
      out:scale={{ duration: 200, start: 1 }}
    >
      <!-- Header Section -->
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-800">{modalTitle}</h2>
              <p class="text-sm text-gray-500">
                {modalOrders.length} {modalOrders.length === 1 ? 'order' : 'orders'} found
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Content Section -->
      <div class="flex-1 p-6 overflow-y-auto">
        {#if modalOrders.length === 0}
          <div class="flex flex-col items-center justify-center py-16 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-lg font-medium">No orders found</p>
            <p class="text-sm">There are no orders matching your criteria</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each modalOrders as order}
              <div class="p-4 rounded-lg border {order.status === 'completed' ? getCompletionClass(order.due_date, order.updated_at) : getUrgencyClass(order.due_date)}">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center gap-3">
                      <span class="font-semibold">#{order.id}</span>
                      <span class="text-xs px-2 py-1 rounded-full bg-white bg-opacity-40">
                        {#if order.status === 'completed'}
                          {getCompletionStatus(order.due_date, order.updated_at)}
                        {:else}
                          {getDaysUntilDue(order.due_date)}
                        {/if}
                      </span>
                    </div>
                    <p class="text-sm mt-2">
                      {order.students.first_name} {order.students.last_name}
                      <span class="text-opacity-75 ml-1">• {order.students.course.course_code}</span>
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <span class="text-xs font-medium">{order.uniform_type}</span>
                      <span class="h-1 w-1 rounded-full bg-current opacity-50"></span>
                      <span class="text-xs">
                        {order.status === 'completed' 
                          ? `Completed on ${formatDate(order.updated_at)}`
                          : `Due on ${formatDate(order.due_date)}`
                        }
                      </span>
                    </div>
                  </div>
                  <a 
                    href={`/employee/orders/${order.id}`} 
                    class="text-primary hover:underline text-sm"
                  >
                    View Details
                  </a>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- Footer Section -->
      <div class="p-6 border-t border-gray-100 bg-white">
        <div class="flex justify-end">
          <button 
            class="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200"
            on:click={closeModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for better UX */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 10px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
</style>
