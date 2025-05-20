import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const load = async ({ locals, url }) => {
    try {
        // Check if we need to load transactions first (for tab=transactions)
        const activeTab = url.searchParams.get('tab') === 'transactions' ? 'transactions' : 'inventory';
        
        // Fetch all inventory items
        const { data: inventoryItems, error: inventoryError } = await supabase
            .from('inventory_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (inventoryError) throw inventoryError;

        // Fetch recent transactions for display
        const { data: recentTransactions, error: transactionError } = await supabase
            .from('inventory_transactions')
            .select(`
                id,
                inventory_item_id,
                transaction_type,
                quantity,
                notes,
                order_id,
                transaction_date,
                created_by,
                inventory_items:inventory_item_id(name)
            `)
            .order('transaction_date', { ascending: false })
            .limit(50);

        if (transactionError) throw transactionError;

        return {
            inventoryItems,
            recentTransactions,
            activeTab
        };
    } catch (err) {
        console.error('Error:', err);
        throw error(500, 'Failed to load inventory data');
    }
};

export const actions = {
    createItem: async ({ request }) => {
        try {
            const formData = await request.formData();
            const name = formData.get('name').trim();
            const description = formData.get('description')?.trim() || null;
            const unitOfMeasurement = formData.get('unitOfMeasurement').trim();
            const quantityAvailable = parseFloat(formData.get('quantityAvailable') || '0');
            const minimumStockLevel = parseFloat(formData.get('minimumStockLevel') || '0');
            const costPerUnit = parseFloat(formData.get('costPerUnit') || '0');

            if (!name || !unitOfMeasurement) {
                return {
                    type: 'error',
                    data: { error: 'Name and unit of measurement are required' }
                };
            }

            const { data, error: insertError } = await supabase
                .from('inventory_items')
                .insert({
                    name,
                    description,
                    unit_of_measurement: unitOfMeasurement,
                    quantity_available: quantityAvailable,
                    minimum_stock_level: minimumStockLevel,
                    cost_per_unit: costPerUnit,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') { // Unique constraint violation
                    return {
                        type: 'error',
                        data: { error: 'An item with this name already exists' }
                    };
                }
                throw insertError;
            }

            // Create initial stock-in transaction if quantity > 0
            if (quantityAvailable > 0) {
                await supabase
                    .from('inventory_transactions')
                    .insert({
                        inventory_item_id: data.id,
                        transaction_type: 'stock_in',
                        quantity: quantityAvailable,
                        notes: 'Initial inventory',
                        created_by: 'system'
                    });
            }

            return {
                type: 'success',
                data: { message: 'Inventory item added successfully', item: data }
            };
        } catch (err) {
            console.error('Error:', err);
            return {
                type: 'error',
                data: { error: err.message }
            };
        }
    },

    updateItem: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            const name = formData.get('name').trim();
            const description = formData.get('description')?.trim() || null;
            const unitOfMeasurement = formData.get('unitOfMeasurement').trim();
            const minimumStockLevel = parseFloat(formData.get('minimumStockLevel') || '0');
            const costPerUnit = parseFloat(formData.get('costPerUnit') || '0');

            if (!id || !name || !unitOfMeasurement) {
                return {
                    type: 'error',
                    data: { error: 'ID, name, and unit of measurement are required' }
                };
            }

            // Get current item to compare quantity
            const { data: currentItem } = await supabase
                .from('inventory_items')
                .select('quantity_available')
                .eq('id', id)
                .single();

            const { data, error: updateError } = await supabase
                .from('inventory_items')
                .update({
                    name,
                    description,
                    unit_of_measurement: unitOfMeasurement,
                    minimum_stock_level: minimumStockLevel,
                    cost_per_unit: costPerUnit,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                if (updateError.code === '23505') { // Unique constraint violation
                    return {
                        type: 'error',
                        data: { error: 'An item with this name already exists' }
                    };
                }
                throw updateError;
            }

            return {
                type: 'success',
                data: { message: 'Inventory item updated successfully', item: data }
            };
        } catch (err) {
            console.error('Error:', err);
            return {
                type: 'error',
                data: { error: err.message }
            };
        }
    },

    updateQuantity: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            const quantity = parseFloat(formData.get('quantity') || '0');
            const transactionType = formData.get('transactionType');
            const notes = formData.get('notes')?.trim() || null;
            const createdBy = formData.get('createdBy') || 'admin';

            if (!id || isNaN(quantity) || !transactionType) {
                return {
                    type: 'error',
                    data: { error: 'ID, quantity and transaction type are required' }
                };
            }

            // Get current quantity
            const { data: currentItem } = await supabase
                .from('inventory_items')
                .select('quantity_available')
                .eq('id', id)
                .single();

            if (!currentItem) {
                return {
                    type: 'error',
                    data: { error: 'Inventory item not found' }
                };
            }

            let newQuantity;
            if (transactionType === 'stock_in') {
                newQuantity = currentItem.quantity_available + quantity;
            } else if (transactionType === 'stock_out') {
                newQuantity = currentItem.quantity_available - quantity;
                if (newQuantity < 0) {
                    return {
                        type: 'error',
                        data: { error: 'Insufficient stock available' }
                    };
                }
            } else if (transactionType === 'adjustment') {
                newQuantity = quantity; // Direct adjustment to specific value
            } else {
                return {
                    type: 'error',
                    data: { error: 'Invalid transaction type' }
                };
            }

            // Create transaction record
            const { error: transactionError } = await supabase
                .from('inventory_transactions')
                .insert({
                    inventory_item_id: id,
                    transaction_type: transactionType,
                    quantity: quantity,
                    notes,
                    created_by: createdBy
                });

            if (transactionError) throw transactionError;

            // Update inventory quantity
            const { data, error: updateError } = await supabase
                .from('inventory_items')
                .update({
                    quantity_available: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return {
                type: 'success',
                data: { 
                    message: 'Inventory quantity updated successfully', 
                    item: data,
                    transaction: {
                        type: transactionType,
                        quantity: quantity
                    }
                }
            };
        } catch (err) {
            console.error('Error:', err);
            return {
                type: 'error',
                data: { error: err.message }
            };
        }
    },

    deleteItem: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');

            if (!id) {
                return {
                    type: 'error',
                    data: { error: 'Item ID is required' }
                };
            }

            // Delete related transactions first (due to foreign key constraints)
            const { error: transactionDeleteError } = await supabase
                .from('inventory_transactions')
                .delete()
                .eq('inventory_item_id', id);

            if (transactionDeleteError) throw transactionDeleteError;

            // Delete the inventory item
            const { error: deleteError } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return {
                type: 'success',
                data: { message: 'Inventory item deleted successfully' }
            };
        } catch (err) {
            console.error('Error:', err);
            return {
                type: 'error',
                data: { error: err.message }
            };
        }
    }
};
