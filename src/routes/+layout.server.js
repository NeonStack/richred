export const load = async ({ locals }) => {
  let permissions = [];
  let profile = null;

  if (locals.session) {
    // Fetch user profile data
    const { data: profileData } = await locals.supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", locals.session.user.id)
      .single();
    
    profile = profileData;

    // Fetch admin permissions if user is admin
    if (locals.userRole === "admin") {
      const { data } = await locals.supabase
        .from("admin_permissions")
        .select("route_path")
        .eq("admin_id", locals.session.user.id);

      permissions = data?.map((p) => p.route_path) || [];
    }
  }
  
  return {
    session: locals.session,
    userRole: locals.userRole,
    permissions,
    profile,
  };
};
