<script>
    export let data;
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { slide, fade } from 'svelte/transition';

    let searchTerm = '';
    let sortBy = 'dueDate'; // 'studentName', 'dueDate', 'amount'
    let sortOrder = 'asc';
    let activeTab = 'urgent';
    let showMeasurements = false;
    let selectedOrder = null;
    let startDate = '';
    let endDate = '';
    let selectedCourseId = 'all';
    let showFilters = false;
    let selectedUniformType = 'all';
    let selectedPaymentStatus = 'all';

    function clearDateRange() {
        startDate = '';
        endDate = '';
    }

    function getDueLabel(daysUntilDue) {
        if (daysUntilDue < 0) return 'Overdue';
        if (daysUntilDue === 0) return 'Due today';
        if (daysUntilDue === 1) return 'Due tomorrow';
        return `Due in ${daysUntilDue} days`;
    }

    function getCompletionLabel(order) {
        return order.completedInTime ? 'Completed in Time' : 'Completed Late';
    }

    function getOrderLabel(order) {
        if (order.uniformType === 'both') return 'Full Uniform';
        return order.uniformType === 'upper' ? 'Upper Wear' : 'Lower Wear';
    }

    function getMeasurementsByType(measurements, uniformConfigs) {
        const upper = [];
        const lower = [];

        Object.entries(measurements).forEach(([measurementId, value]) => {
            const measurementType = data.measurementTypes.find(m => m.id === parseInt(measurementId));
            if (!measurementType) return;

            const measurementInfo = {
                name: measurementType.name,
                value: value,
                unit: 'cm'
            };

            // Check if measurement is used in upper or lower wear
            uniformConfigs.forEach(config => {
                const specs = config.measurement_specs;
                const isUsed = specs.some(spec => spec.measurement_type_id === parseInt(measurementId));
                if (isUsed) {
                    if (config.wear_type === 'upper') upper.push(measurementInfo);
                    else if (config.wear_type === 'lower') lower.push(measurementInfo);
                }
            });
        });

        return { upper, lower };
    }

    function clearAllFilters() {
        searchTerm = '';
        selectedCourseId = 'all';
        selectedUniformType = 'all';
        selectedPaymentStatus = 'all';
        startDate = '';
        endDate = '';
        sortBy = 'dueDate';
        sortOrder = 'asc';
    }

    $: baseOrders = (() => {
        switch(activeTab) {
            case 'urgent':
                return data.urgentOrders || [];
            case 'inProgress':
                return data.inProgressOrders || [];
            case 'completed':
                return data.completedOrders || [];
            default:
                return [];
        }
    })();

    $: searchFiltered = searchTerm.trim()
        ? baseOrders.filter(order => {
            const searchText = `${order.studentName} ${order.course} ${order.id}`.toLowerCase();
            return searchTerm.toLowerCase().split(/\s+/).every(term => searchText.includes(term));
        })
        : baseOrders;

    $: dateFiltered = (startDate && endDate)
        ? searchFiltered.filter(order => {
            const orderDate = new Date(order.dueDate);
            orderDate.setHours(0, 0, 0, 0);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return orderDate >= start && orderDate <= end;
        })
        : searchFiltered;

    $: criteriaFiltered = dateFiltered.filter(order => {
        const courseMatch = selectedCourseId === 'all' || order.courseId === parseInt(selectedCourseId);
        const typeMatch = selectedUniformType === 'all' || order.uniformType === selectedUniformType;
        const paymentMatch = selectedPaymentStatus === 'all' || order.paymentStatus === selectedPaymentStatus;
        return courseMatch && typeMatch && paymentMatch;
    });

    $: displayedOrders = criteriaFiltered.sort((a, b) => {
        switch(sortBy) {
            case 'studentName':
                return sortOrder === 'asc' 
                    ? a.studentName.localeCompare(b.studentName)
                    : b.studentName.localeCompare(a.studentName);
            case 'dueDate':
                return sortOrder === 'asc' 
                    ? new Date(a.dueDate) - new Date(b.dueDate)
                    : new Date(b.dueDate) - new Date(a.dueDate);
            case 'amount':
                return sortOrder === 'asc' 
                    ? a.totalAmount - b.totalAmount
                    : b.totalAmount - a.totalAmount;
            default:
                return 0;
        }
    });

    $: urgentCount = data.urgentOrders.filter(order => {
        if (searchTerm.trim()) {
            const searchText = `${order.studentName} ${order.course} ${order.id}`.toLowerCase();
            if (!searchTerm.toLowerCase().split(/\s+/).every(term => searchText.includes(term))) return false;
        }
        if (selectedCourseId !== 'all' && order.courseId !== parseInt(selectedCourseId)) return false;
        if (selectedUniformType !== 'all' && order.uniformType !== selectedUniformType) return false;
        if (selectedPaymentStatus !== 'all' && order.paymentStatus !== selectedPaymentStatus) return false;
        if (startDate && endDate) {
            const orderDate = new Date(order.dueDate);
            orderDate.setHours(0, 0, 0, 0);
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (!(orderDate >= start && orderDate <= end)) return false;
        }
        return true;
    }).length;

    $: inProgressCount = data.inProgressOrders.filter(order => {
        if (searchTerm.trim()) {
            const searchText = `${order.studentName} ${order.course} ${order.id}`.toLowerCase();
            if (!searchTerm.toLowerCase().split(/\s+/).every(term => searchText.includes(term))) return false;
        }
        if (selectedCourseId !== 'all' && order.courseId !== parseInt(selectedCourseId)) return false;
        if (selectedUniformType !== 'all' && order.uniformType !== selectedUniformType) return false;
        if (selectedPaymentStatus !== 'all' && order.paymentStatus !== selectedPaymentStatus) return false;
        if (startDate && endDate) {
            const orderDate = new Date(order.dueDate);
            orderDate.setHours(0, 0, 0, 0);
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (!(orderDate >= start && orderDate <= end)) return false;
        }
        return true;
    }).length;

    $: completedCount = data.completedOrders.filter(order => {
        if (searchTerm.trim()) {
            const searchText = `${order.studentName} ${order.course} ${order.id}`.toLowerCase();
            if (!searchTerm.toLowerCase().split(/\s+/).every(term => searchText.includes(term))) return false;
        }
        if (selectedCourseId !== 'all' && order.courseId !== parseInt(selectedCourseId)) return false;
        if (selectedUniformType !== 'all' && order.uniformType !== selectedUniformType) return false;
        if (selectedPaymentStatus !== 'all' && order.paymentStatus !== selectedPaymentStatus) return false;
        if (startDate && endDate) {
            const orderDate = new Date(order.dueDate);
            orderDate.setHours(0, 0, 0, 0);
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (!(orderDate >= start && orderDate <= end)) return false;
        }
        return true;
    }).length;

    const handleComplete = async () => {
        return async ({ result }) => {
            if (result.type === 'success') {
                await invalidateAll();
                activeTab = 'completed';
            } else if (result.type === 'failure') {
                showError(result.error || 'Failed to create course');
            }
        };
    }

    // Get unique courses from all orders - fix duplicates by using courseId as key
    $: availableCourses = Object.values(
        [...data.urgentOrders, ...data.inProgressOrders, ...data.completedOrders]
        .reduce((acc, order) => {
            // Use courseId as key to prevent duplicates
            acc[order.courseId] = {
                id: order.courseId,
                code: order.course
            };
            return acc;
        }, {})
    ).sort((a, b) => a.code.localeCompare(b.code));
</script>

<div class="p-6 max-w-7xl mx-auto">
    <div class="bg-white rounded-lg shadow-md">
        <!-- Header with filters -->
        <div class="border-b p-4 md:p-6 space-y-4">
            <div class="flex justify-between items-center">
                <h1 class="text-xl md:text-2xl font-bold text-foreground">My Orders</h1>
                <button
                    class="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    on:click={() => showFilters = !showFilters}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters {showFilters ? '(Active)' : ''}
                </button>
            </div>

            {#if showFilters}
                <div class="grid gap-4 p-4 bg-gray-50 rounded-lg" transition:slide={{ duration: 300 }}>
                    <!-- Search and basic filters -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Search student name or ID..."
                            bind:value={searchTerm}
                            class="px-4 py-2 border rounded-lg"
                        />
                        
                        <select 
                            bind:value={selectedCourseId}
                            class="px-4 py-2 border rounded-lg"
                        >
                            <option value="all">All Courses</option>
                            {#each availableCourses as course}
                                <option value={course.id}>{course.code}</option>
                            {/each}
                        </select>

                        <select 
                            bind:value={selectedUniformType}
                            class="px-4 py-2 border rounded-lg"
                        >
                            <option value="all">All Uniform Types</option>
                            <option value="upper">Upper Wear</option>
                            <option value="lower">Lower Wear</option>
                            <option value="both">Full Uniform</option>
                        </select>

                        <select 
                            bind:value={selectedPaymentStatus}
                            class="px-4 py-2 border rounded-lg"
                        >
                            <option value="all">All Payment Status</option>
                            <option value="not paid">Not Paid</option>
                            <option value="partial">Partially Paid</option>
                            <option value="fully paid">Fully Paid</option>
                        </select>

                        <div class="flex gap-2">
                            <select bind:value={sortBy} class="border rounded-lg px-4 py-2 flex-1">
                                <option value="dueDate">Sort by Due Date</option>
                                <option value="studentName">Sort by Name</option>
                                <option value="amount">Sort by Amount</option>
                            </select>
                            <select bind:value={sortOrder} class="border rounded-lg px-4 py-2 w-24">
                                <option value="asc">↑</option>
                                <option value="desc">↓</option>
                            </select>
                        </div>

                        <div class="flex gap-2">
                            <input 
                                type="date" 
                                bind:value={startDate}
                                class="border rounded-lg px-4 py-2 flex-1"
                                max={endDate || undefined}
                                placeholder="From"
                            />
                            <input 
                                type="date" 
                                bind:value={endDate}
                                class="border rounded-lg px-4 py-2 flex-1"
                                min={startDate || undefined}
                                placeholder="To"
                            />
                        </div>
                    </div>

                    <!-- Clear filters button -->
                    <div class="flex justify-end">
                        <button
                            class="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            on:click={clearAllFilters}
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            {/if}

            <!-- Tabs with better mobile styling -->
            <div class="flex flex-wrap gap-2 md:gap-4">
                <button 
                    type="button"
                    class="px-3 md:px-6 py-2 rounded-lg transition-colors text-sm md:text-base {activeTab === 'urgent' ? 'bg-red-100 text-red-800 font-semibold' : 'hover:bg-gray-100'}"
                    on:click|preventDefault={() => activeTab = 'urgent'}
                >
                    Urgent ({urgentCount})
                </button>
                <button 
                    type="button"
                    class="px-6 py-2 rounded-lg transition-colors {activeTab === 'inProgress' ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-gray-100'}"
                    on:click|preventDefault={() => activeTab = 'inProgress'}
                >
                    In Progress ({inProgressCount})
                </button>
                <button 
                    type="button"
                    class="px-6 py-2 rounded-lg transition-colors {activeTab === 'completed' ? 'bg-green-100 text-green-800 font-semibold' : 'hover:bg-gray-100'}"
                    on:click|preventDefault={() => activeTab = 'completed'}
                >
                    Completed ({completedCount})
                </button>
            </div>
        </div>

        <!-- Orders Grid with improved mobile design -->
        <div class="p-4 md:p-6">
            {#key activeTab}
                {#if displayedOrders.length === 0}
                    <div class="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 class="mt-4 text-lg font-medium text-gray-900">No orders found</h3>
                        <p class="mt-1 text-gray-500">
                            {#if searchTerm || selectedCourseId !== 'all' || selectedUniformType !== 'all' || selectedPaymentStatus !== 'all' || startDate || endDate}
                                No orders match your current filters
                            {:else}
                                {#if activeTab === 'urgent'}
                                    No urgent orders at the moment
                                {:else if activeTab === 'inProgress'}
                                    No orders in progress
                                {:else}
                                    No completed orders yet
                                {/if}
                            {/if}
                        </p>
                        {#if searchTerm || selectedCourseId !== 'all' || selectedUniformType !== 'all' || selectedPaymentStatus !== 'all' || startDate || endDate}
                            <button 
                                class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                on:click={clearAllFilters}
                            >
                                Clear all filters
                            </button>
                        {/if}
                    </div>
                {:else}
                    <div class="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3" transition:fade={{ duration: 150 }}>
                        {#each displayedOrders as order (order.id)}
                            <div class="border rounded-lg p-4 md:p-6 hover:shadow-lg transition-shadow bg-gray-50">
                                <!-- Order header -->
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 class="font-semibold text-sm md:text-base truncate max-w-[160px] md:max-w-[200px]">{order.studentName}</h3>
                                        <p class="text-xs text-gray-600">{order.course}</p>
                                    </div>
                                    <span class="px-2 py-1 text-xs {activeTab === 'urgent' ? 'bg-red-100 text-red-800' :
                                                            activeTab === 'inProgress' ? 'bg-blue-100 text-blue-800' : 
                                                            order.completedInTime ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} rounded-full font-medium">
                                        {#if activeTab === 'completed'}
                                            {getCompletionLabel(order)}
                                        {:else}
                                            {getDueLabel(order.daysUntilDue)}
                                        {/if}
                                    </span>
                                </div>

                                <!-- Order details -->
                                <div class="space-y-2 text-xs border-t border-b py-3 my-3">
                                    <p class="flex justify-between">
                                        <span class="text-gray-600">Order ID:</span>
                                        <span class="font-medium">#{order.id}</span>
                                    </p>
                                    <p class="flex justify-between">
                                        <span class="text-gray-600">Type:</span>
                                        <span class="font-medium">{getOrderLabel(order)}</span>
                                    </p>
                                    <p class="flex justify-between">
                                        <span class="text-gray-600">Due Date:</span>
                                        <span class="font-medium">{new Date(order.dueDate).toLocaleDateString()}</span>
                                    </p>
                                    {#if order.completed_at}
                                        <p class="flex justify-between">
                                            <span class="text-gray-600">Completed:</span>
                                            <span class="font-medium">{new Date(order.completed_at).toLocaleDateString()}</span>
                                        </p>
                                    {/if}
                                    <p class="flex justify-between">
                                        <span class="text-gray-600">Amount:</span>
                                        <span class="font-medium">₱{order.totalAmount}</span>
                                    </p>
                                    <p class="flex justify-between">
                                        <span class="text-gray-600">Payment:</span>
                                        <span class="font-medium">{order.paymentStatus}</span>
                                    </p>
                                </div>

                                <!-- Replace the Measurements button with View Details -->
                                <div class="mt-4 mb-3">
                                    <a 
                                        href="/employee/orders/{order.id}"
                                        class="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
                                        </svg>
                                        View Details
                                    </a>
                                </div>

                                <!-- Action buttons -->
                                {#if activeTab !== 'completed'}
                                    <form 
                                        method="POST" 
                                        action="?/updateStatus"
                                        use:enhance={handleComplete}
                                    >
                                        <input type="hidden" name="orderId" value={order.id} />
                                        <button 
                                            type="submit"
                                            class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Mark as Completed
                                        </button>
                                    </form>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            {/key}
        </div>
    </div>
</div>