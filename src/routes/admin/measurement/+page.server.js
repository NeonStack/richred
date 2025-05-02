import { error, fail } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

const toSentenceCase = (str) => {
    return str
        .toLowerCase()
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim()                // Remove leading/trailing spaces
        .replace(/^.|\s\S/g, letter => letter.toUpperCase());
};

const NAME_MAX_LENGTH = 40;
const NAME_PATTERN = /^[A-Za-z0-9\s-]+$/;
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

export const load = async ({ locals }) => {
    try {
        // First get all measurement types
        const { data: measurements, error: fetchError } = await supabase
            .from('measurement_types')
            .select('*')
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Get usage counts for each measurement type
        const { data: configurations } = await supabase
            .from('uniform_configuration')
            .select('measurement_specs');

        // Count usages for each measurement type
        const usageCounts = measurements.map(measurement => {
            const count = configurations.filter(config => 
                config.measurement_specs.some(spec => 
                    spec.measurement_type_id === measurement.id
                )
            ).length;
            
            return {
                ...measurement,
                usage_count: count
            };
        });

        return {
            measurements: usageCounts
        };
    } catch (err) {
        console.error('Error:', err);
        throw error(500, 'Error fetching measurement types');
    }
};

// Validate decimal field
const validateDecimalField = (value, fieldName) => {
    if (value === null || value === undefined || value === '') {
        return `${fieldName} is required`;
    }
    
    if (!DECIMAL_PATTERN.test(value)) {
        return `${fieldName} must be a valid decimal number (up to 2 decimal places)`;
    }
    
    return null;
};

export const actions = {
    create: async ({ request }) => {
        const formData = await request.formData();
        const names = formData.getAll('names');
        const default_base_cms = formData.getAll('default_base_cms');
        const default_additional_cost_per_cms = formData.getAll('default_additional_cost_per_cms');

        // Create an array of measurement objects
        const measurements = names.map((name, index) => ({
            name: toSentenceCase(name.toString().trim()),
            default_base_cm: default_base_cms[index]?.toString().trim(),
            default_additional_cost_per_cm: default_additional_cost_per_cms[index]?.toString().trim()
        })).filter(m => m.name.length > 0);

        if (measurements.length === 0) {
            return fail(400, {
                error: 'At least one measurement name is required'
            });
        }

        // Validate each measurement
        const validationErrors = [];
        
        measurements.forEach((measurement, index) => {
            // Validate name
            if (!measurement.name) {
                validationErrors.push(`Measurement name is required for entry ${index + 1}`);
            } else if (measurement.name.length > NAME_MAX_LENGTH) {
                validationErrors.push(`Name must not exceed ${NAME_MAX_LENGTH} characters for entry ${index + 1}`);
            } else if (!NAME_PATTERN.test(measurement.name)) {
                validationErrors.push(`Measurement name can only contain letters, numbers, spaces, and dashes for entry ${index + 1}`);
            }
            
            // Validate default_base_cm
            const baseCmError = validateDecimalField(measurement.default_base_cm, 'Default base cm');
            if (baseCmError) {
                validationErrors.push(`${baseCmError} for entry ${index + 1}`);
            }
            
            // Validate default_additional_cost_per_cm
            const costPerCmError = validateDecimalField(measurement.default_additional_cost_per_cm, 'Default cost per cm');
            if (costPerCmError) {
                validationErrors.push(`${costPerCmError} for entry ${index + 1}`);
            }
        });

        if (validationErrors.length > 0) {
            return fail(400, {
                error: validationErrors.join('\n')
            });
        }

        try {
            // First check for existing measurements with sentence case names
            const { data: existingMeasurements } = await supabase
                .from('measurement_types')
                .select('name')
                .in('name', measurements.map(m => m.name));

            if (existingMeasurements && existingMeasurements.length > 0) {
                const duplicates = existingMeasurements.map(m => m.name).join(', ');
                return fail(400, {
                    error: `Measurement types already exist: ${duplicates}`
                });
            }

            const { error: insertError } = await supabase
                .from('measurement_types')
                .insert(measurements);

            if (insertError) throw insertError;

            return { success: true };
        } catch (err) {
            console.error('Error:', err);
            return fail(500, {
                error: 'Failed to create measurement types'
            });
        }
    },

    update: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');
        const name = toSentenceCase(formData.get('name')?.toString().trim() || '');
        const default_base_cm = formData.get('default_base_cm')?.toString().trim() || "0";
        const default_additional_cost_per_cm = formData.get('default_additional_cost_per_cm')?.toString().trim() || "0";

        if (!id || !name) {
            return fail(400, {
                error: 'Measurement ID and name are required'
            });
        }

        // Validate name
        if (name.length > NAME_MAX_LENGTH) {
            return fail(400, {
                error: `Name must not exceed ${NAME_MAX_LENGTH} characters`
            });
        }

        if (!NAME_PATTERN.test(name)) {
            return fail(400, {
                error: 'Measurement name can only contain letters, numbers, spaces, and dashes'
            });
        }

        // Validate default_base_cm
        const baseCmError = validateDecimalField(default_base_cm, 'Default base cm');
        if (baseCmError) {
            return fail(400, { error: baseCmError });
        }
        
        // Validate default_additional_cost_per_cm
        const costPerCmError = validateDecimalField(default_additional_cost_per_cm, 'Default cost per cm');
        if (costPerCmError) {
            return fail(400, { error: costPerCmError });
        }

        try {
            // Check if the new name already exists (excluding current record)
            const { data: existing } = await supabase
                .from('measurement_types')
                .select('id')
                .eq('name', name)
                .neq('id', id)
                .maybeSingle();

            if (existing) {
                return fail(400, {
                    error: `A measurement type with name "${name}" already exists`
                });
            }

            const { error: updateError } = await supabase
                .from('measurement_types')
                .update({ 
                    name,
                    default_base_cm,
                    default_additional_cost_per_cm 
                })
                .eq('id', id);

            if (updateError) throw updateError;

            return { success: true };
        } catch (err) {
            console.error('Error:', err);
            return fail(500, {
                error: 'Failed to update measurement type'
            });
        }
    },

    delete: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        if (!id) {
            return fail(400, {
                error: 'Measurement ID is required'
            });
        }

        try {
            // Improved check for measurement type usage
            const { data: configs, error: checkError } = await supabase
                .from('uniform_configuration')
                .select('measurement_specs');

            if (checkError) throw checkError;

            // Check if any configuration uses this measurement type
            const isUsed = configs.some(config => 
                config.measurement_specs.some(spec => 
                    spec.measurement_type_id === Number(id)
                )
            );

            if (isUsed) {
                return fail(400, {
                    error: 'Cannot delete this measurement type as it is being used in uniform configurations'
                });
            }

            // If not used, proceed with deletion
            const { error: deleteError } = await supabase
                .from('measurement_types')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return { success: true };
        } catch (err) {
            console.error('Error:', err);
            return fail(500, {
                error: 'Failed to delete measurement type'
            });
        }
    }
};
