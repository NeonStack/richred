import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const load = async ({ params, locals }) => {
    if (!locals.session) throw error(401, 'Unauthorized');

    try {
        // Fetch the specific order with related data
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                students:students (
                    id,
                    first_name,
                    last_name,
                    gender,
                    measurements,
                    contact_number,
                    address,
                    courses:courses (
                        id,
                        course_code,
                        description
                    )
                )
            `)
            .eq('id', params.id)
            .single();

        if (orderError) throw orderError;

        // Check if the employee is assigned to this order
        if (order.employee_id !== locals.session.user.id) {
            throw error(403, 'Not authorized to view this order');
        }

        // Fetch measurement types
        const { data: measurementTypes } = await supabase
            .from('measurement_types')
            .select('*');

        // Fetch uniform configurations
        const { data: uniformConfigs } = await supabase
            .from('uniform_configuration')
            .select('*, measurement_specs')
            .eq('gender', order.students.gender)
            .or(`course_id.eq.${order.students.courses.id},course_id.is.null`);

        return {
            order: {
                ...order,
                studentName: `${order.students.first_name} ${order.students.last_name}`,
                courseName: order.students.courses.course_code,
                courseDescription: order.students.courses.description,
                measurements: order.order_measurements || order.students.measurements || {},
                studentDetails: {
                    gender: order.students.gender,
                    contact: order.students.contact_number,
                    address: order.students.address
                }
            },
            measurementTypes,
            uniformConfigs
        };
    } catch (err) {
        console.error('Error:', err);
        throw error(500, 'Failed to load order details');
    }
};
