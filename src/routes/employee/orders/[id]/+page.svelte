<script>
    export let data;
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';

    // Helper functions
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getOrderStatus(order) {
        const daysUntilDue = Math.ceil((new Date(order.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        if (order.status === 'completed') {
            const completedDate = new Date(order.completed_at);
            const dueDate = new Date(order.due_date);
            return {
                label: completedDate <= dueDate ? 'Completed in Time' : 'Completed Late',
                class: completedDate <= dueDate ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            };
        }
        
        if (daysUntilDue <= 3) {
            return {
                label: daysUntilDue < 0 ? 'Overdue' : daysUntilDue === 0 ? 'Due Today' : `${daysUntilDue} Days Left`,
                class: 'bg-red-100 text-red-800'
            };
        }
        
        return {
            label: `${daysUntilDue} Days Left`,
            class: 'bg-blue-100 text-blue-800'
        };
    }

    const orderStatus = getOrderStatus(data.order);
</script>

<div class="max-w-4xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <!-- Header -->
        <div class="border-b p-6">
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-2xl font-bold">Order #{data.order.id}</h1>
                    <p class="mt-1 text-gray-600">Created on {formatDate(data.order.created_at)}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-medium {orderStatus.class}">
                    {orderStatus.label}
                </span>
            </div>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
            <!-- Student Information -->
            <section class="space-y-4">
                <h2 class="text-lg font-semibold border-b pb-2">Student Information</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-gray-600">Name</p>
                        <p class="font-medium">{data.order.studentName}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Course</p>
                        <p class="font-medium">{data.order.courseName}</p>
                        <p class="text-sm text-gray-500">{data.order.courseDescription}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Gender</p>
                        <p class="font-medium capitalize">{data.order.studentDetails.gender}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Contact</p>
                        <p class="font-medium">{data.order.studentDetails.contact || 'Not provided'}</p>
                    </div>
                    {#if data.order.studentDetails.address}
                        <div class="col-span-2">
                            <p class="text-gray-600">Address</p>
                            <p class="font-medium">{data.order.studentDetails.address}</p>
                        </div>
                    {/if}
                </div>
            </section>

            <!-- Order Details -->
            <section class="space-y-4">
                <h2 class="text-lg font-semibold border-b pb-2">Order Details</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-gray-600">Uniform Type</p>
                        <p class="font-medium capitalize">{data.order.uniform_type}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Due Date</p>
                        <p class="font-medium">{formatDate(data.order.due_date)}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Total Amount</p>
                        <p class="font-medium">₱{data.order.total_amount}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Payment Status</p>
                        <span class="inline-block px-2 py-1 text-sm font-medium rounded-full
                            {data.order.payment_status === 'fully paid' ? 'bg-green-100 text-green-800' :
                            data.order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}">
                            {data.order.payment_status}
                        </span>
                    </div>
                    {#if data.order.amount_paid > 0}
                        <div>
                            <p class="text-gray-600">Amount Paid</p>
                            <p class="font-medium">₱{data.order.amount_paid}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Balance</p>
                            <p class="font-medium">₱{data.order.total_amount - data.order.amount_paid}</p>
                        </div>
                    {/if}
                </div>
            </section>

            <!-- Measurements -->
            <section class="space-y-4">
                <h2 class="text-lg font-semibold border-b pb-2">Measurements</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {#if data.order.uniform_type === 'upper' || data.order.uniform_type === 'both'}
                        <div class="space-y-3">
                            <h3 class="font-medium text-blue-800">Upper Wear</h3>
                            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                                {#each Object.entries(data.order.measurements) as [measurementId, value]}
                                    {#if data.uniformConfigs.some(c => 
                                        c.wear_type === 'upper' && 
                                        c.measurement_specs.some(s => s.measurement_type_id === parseInt(measurementId))
                                    )}
                                        {@const measurementType = data.measurementTypes.find(m => m.id === parseInt(measurementId))}
                                        {#if measurementType}
                                            <div class="flex justify-between items-center border-b border-gray-200 pb-2">
                                                <span class="capitalize text-gray-700">{measurementType.name}</span>
                                                <span class="font-medium bg-white px-3 py-1 rounded-full border">{value} cm</span>
                                            </div>
                                        {/if}
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if data.order.uniform_type === 'lower' || data.order.uniform_type === 'both'}
                        <div class="space-y-3">
                            <h3 class="font-medium text-blue-800">Lower Wear</h3>
                            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                                {#each Object.entries(data.order.measurements) as [measurementId, value]}
                                    {#if data.uniformConfigs.some(c => 
                                        c.wear_type === 'lower' && 
                                        c.measurement_specs.some(s => s.measurement_type_id === parseInt(measurementId))
                                    )}
                                        {@const measurementType = data.measurementTypes.find(m => m.id === parseInt(measurementId))}
                                        {#if measurementType}
                                            <div class="flex justify-between items-center border-b border-gray-200 pb-2">
                                                <span class="capitalize text-gray-700">{measurementType.name}</span>
                                                <span class="font-medium bg-white px-3 py-1 rounded-full border">{value} cm</span>
                                            </div>
                                        {/if}
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </section>

            <!-- Action Buttons -->
            {#if data.order.status !== 'completed'}
                <div class="flex justify-end pt-4 border-t">
                    <form 
                        method="POST" 
                        action="/employee/orders?/updateStatus"
                        use:enhance
                    >
                        <input type="hidden" name="orderId" value={data.order.id} />
                        <button 
                            type="submit"
                            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Mark as Completed
                        </button>
                    </form>
                </div>
            {/if}
        </div>
    </div>
</div>
