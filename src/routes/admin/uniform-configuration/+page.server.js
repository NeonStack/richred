import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const load = async ({ locals }) => {
    try {
        // Fetch uniform configurations with course details and count of matching students
        const { data: configs, error: configError } = await supabase
            .from('uniform_configuration')
            .select(`
                id,
                course_id,
                gender,
                wear_type,
                base_price,
                measurement_specs,
                base_materials,
                created_at,
                courses:course_id(id, course_code)
            `)
            .order('created_at', { ascending: false });

        if (configError) throw configError;

        // Fetch student counts for each configuration
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id, course_id, gender');

        if (studentError) throw studentError;

        // Add student count to each config
        const configsWithCount = configs.map(config => ({
            ...config,
            student_count: students.filter(student => 
                student.course_id === config.course_id && 
                student.gender === config.gender
            ).length
        }));

        // Fetch all courses for the dropdown
        const { data: courses, error: courseError } = await supabase
            .from('courses')
            .select('id, course_code')
            .order('course_code');

        if (courseError) throw courseError;

        // Fetch all measurement types for the selection
        const { data: measurementTypes, error: measurementError } = await supabase
            .from('measurement_types')
            .select('id, name, default_base_cm, default_additional_cost_per_cm')
            .order('name');

        if (measurementError) throw measurementError;
        
        // Fetch all inventory items for material selection
        const { data: inventoryItems, error: inventoryError } = await supabase
            .from('inventory_items')
            .select('*')
            .order('name');
            
        if (inventoryError) throw inventoryError;

        // Prepare a mapping of existing configurations
        const configurationMap = {};

        configs.forEach(config => {
            const courseId = config.course_id?.toString(); // Ensure courseId is a string
            const gender = config.gender;
            const wearType = config.wear_type;

            if (!configurationMap[courseId]) {
                configurationMap[courseId] = {};
            }
            if (!configurationMap[courseId][gender]) {
                configurationMap[courseId][gender] = new Set();
            }
            configurationMap[courseId][gender].add(wearType);
        });

        return {
            configs: configsWithCount,
            courses,
            measurementTypes,
            inventoryItems,
            configurationMap // Add this to be used in the Svelte component
        };
    } catch (err) {
        console.error('Error:', err);
        throw error(500, 'Failed to load uniform configurations');
    }
};

export const actions = {
    create: async ({ request }) => {
        try {
            const formData = await request.formData();
            const gender = formData.get('gender');
            const courseId = formData.get('courseId');
            const wearType = formData.get('wearType');
            const basePrice = parseFloat(formData.get('basePrice'));
            
            // Get selected measurement types and their specifications
            const selectedMeasurements = formData.getAll('selectedMeasurements');
            const measurement_specs = selectedMeasurements.map(typeId => {
                // Get base measurements and costs
                const spec = {
                    measurement_type_id: parseInt(typeId),
                    base_cm: parseFloat(formData.get(`baseCm_${typeId}`) || '0'),
                    additional_cost_per_cm: parseFloat(formData.get(`costPerCm_${typeId}`) || '0')
                };
                
                // Get materials for this measurement type
                const baseMaterialIds = formData.getAll(`baseMaterials_${typeId}`);
                const materialSpecs = [];
                
                baseMaterialIds.forEach(materialId => {
                    const quantity = parseFloat(formData.get(`baseMaterialQty_${typeId}_${materialId}`) || '0');
                    const additionalQty = parseFloat(formData.get(`additionalMaterialQty_${typeId}_${materialId}`) || '0');
                    
                    if (quantity > 0 || additionalQty > 0) {
                        materialSpecs.push({
                            material_id: parseInt(materialId),
                            base_quantity: quantity,
                            additional_quantity_per_cm: additionalQty
                        });
                    }
                });
                
                // Add materials to the spec
                spec.materials = materialSpecs;
                
                return spec;
            });

            // Get base materials for the entire uniform
            const baseMaterialIds = formData.getAll('uniformBaseMaterials');
            const baseMaterials = baseMaterialIds.map(materialId => {
                const quantity = parseFloat(formData.get(`uniformBaseMaterialQty_${materialId}`) || '0');
                return {
                    material_id: parseInt(materialId),
                    quantity: quantity
                };
            }).filter(m => m.quantity > 0);
            
            if (!gender || !courseId || !wearType || !basePrice || measurement_specs.length === 0) {
                throw error(400, 'Missing required fields');
            }

            const { data, error: insertError } = await supabase
                .from('uniform_configuration')
                .insert({
                    gender,
                    course_id: courseId,
                    wear_type: wearType,
                    measurement_specs,
                    base_materials: baseMaterials,
                    base_price: basePrice
                })
                .select()
                .single();

            if (insertError) throw insertError;

            return { success: true, config: data };
        } catch (err) {
            console.error('Error:', err);
            throw error(500, err.message);
        }
    },

    update: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');
            const basePrice = parseFloat(formData.get('basePrice'));

            // Get selected measurement types and their specifications
            const selectedMeasurements = formData.getAll('selectedMeasurements');
            const measurement_specs = selectedMeasurements.map(typeId => {
                // Get base measurements and costs
                const spec = {
                    measurement_type_id: parseInt(typeId),
                    base_cm: parseFloat(formData.get(`baseCm_${typeId}`) || '0'),
                    additional_cost_per_cm: parseFloat(formData.get(`costPerCm_${typeId}`) || '0')
                };
                
                // Get materials for this measurement type
                const baseMaterialIds = formData.getAll(`baseMaterials_${typeId}`);
                const materialSpecs = [];
                
                baseMaterialIds.forEach(materialId => {
                    const quantity = parseFloat(formData.get(`baseMaterialQty_${typeId}_${materialId}`) || '0');
                    const additionalQty = parseFloat(formData.get(`additionalMaterialQty_${typeId}_${materialId}`) || '0');
                    
                    if (quantity > 0 || additionalQty > 0) {
                        materialSpecs.push({
                            material_id: parseInt(materialId),
                            base_quantity: quantity,
                            additional_quantity_per_cm: additionalQty
                        });
                    }
                });
                
                // Add materials to the spec
                spec.materials = materialSpecs;
                
                return spec;
            });

            // Get base materials for the entire uniform
            const baseMaterialIds = formData.getAll('uniformBaseMaterials');
            const baseMaterials = baseMaterialIds.map(materialId => {
                const quantity = parseFloat(formData.get(`uniformBaseMaterialQty_${materialId}`) || '0');
                return {
                    material_id: parseInt(materialId),
                    quantity: quantity
                };
            }).filter(m => m.quantity > 0);

            if (!id || !basePrice || measurement_specs.length === 0) {
                throw error(400, 'Missing required fields');
            }

            // Exclude course_id, gender, and wear_type from the update
            const { data, error: updateError } = await supabase
                .from('uniform_configuration')
                .update({
                    measurement_specs,
                    base_materials: baseMaterials,
                    base_price: basePrice
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return { success: true, config: data };
        } catch (err) {
            console.error('Error:', err);
            throw error(500, err.message);
        }
    },

    delete: async ({ request }) => {
        try {
            const formData = await request.formData();
            const id = formData.get('id');

            if (!id) {
                return {
                    type: 'error',
                    data: { error: 'Configuration ID is required' }
                };
            }

            // Get configuration details first
            const { data: config } = await supabase
                .from('uniform_configuration')
                .select('*')
                .eq('id', id)
                .single();

            // Count matching students
            const { data: students, error: countError } = await supabase
                .from('students')
                .select('id')
                .eq('course_id', config.course_id)
                .eq('gender', config.gender);

            const studentCount = students?.length || 0;

            if (studentCount > 0) {
                console.log({
                    type: 'error',
                    data: { error: `Cannot delete configuration. There are ${studentCount} registered students that match this uniform configuration.` }
                });
                
                return {
                    type: 'error',
                    data: { error: `Cannot delete configuration. There are ${studentCount} registered students that match this uniform configuration.` }
                };
            }

            const { error: deleteError } = await supabase
                .from('uniform_configuration')
                .delete()
                .eq('id', id);

            if (deleteError) {
                return {
                    type: 'error',
                    data: { error: deleteError.message }
                };
            }

            return {
                type: 'success',
                data: { message: 'Uniform configuration deleted successfully' }
            };
        } catch (err) {
            return {
                type: 'error',
                data: { error: err.message }
            };
        }
    }
};
