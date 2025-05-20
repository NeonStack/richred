<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  // Managing the sidebar visibility for mobile devices
  let showSidebar = false;
  const { userRole } = $page.data;

  let navigation = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z" />
      </svg>`,
    },
    {
      name: "Tailor Performance",
      href: "/admin/tailor-performance",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" {...$$props}>
	<path fill="currentColor" d="M3 22V8h4v14zm7 0V2h4v20zm7 0v-8h4v8z" />
</svg>`,
    },
    {
      name: "Inventory Management",
      href: "/admin/inventory",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" {...$$props}>
        <path fill="currentColor" d="M20 2H4c-1 0-2 .9-2 2v3h20V4c0-1.1-.9-2-2-2zM2 19c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-3H2v3zm0-8h20v3H2v-3zm4-3h2v3H6V8zm0 8h2v3H6v-3zm12-8h-6v3h6V8z" />
      </svg>`,
    },
    {
      name: "Student Courses",
      href: "/admin/course",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" {...$$props}>
	<path fill="currentColor" d="M3 23h18V1H3zM14.002 6.688L11.504 8.75V3H16.5v5.75z" />
</svg>`,
    },
    {
      name: "Measurement Types",
      href: "/admin/measurement",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" {...$$props}>
	<path fill="currentColor" d="M18 1H6v5h3.5v2H6v3h5v2H6v3h3.5v2H6v5h12z" />
</svg>`,
    },
    {
      name: "Uniform Configuration",
      href: "/admin/uniform-configuration",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 512 512" {...$$props}>
	<path fill="currentColor" fill-rule="evenodd" d="m234.67 85.33l-.004 213.338h-21.333v42.666h21.333l.005 85.33h42.666l-.004-85.33h21.333v-42.666h-21.333l.004-213.338zm-128.006 0v85.355H85.331v42.645h21.333v213.333h42.667V213.33h21.333v-42.645h-21.333V85.33zm255.981.004v128h-21.333l.013 42.663h21.333v170.666h42.688V255.997h21.333l-.013-42.663h-21.333l.013-128.004z" />
</svg>`,
    },
    {
      name: "Student Management",
      href: "/admin/students",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>`,
    },
    {
      name: "Orders Management",
      href: "/admin/orders",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 16 16" {...$$props}>
	<path fill="currentColor" fill-rule="evenodd" d="M5.5 1a.5.5 0 0 0-.477.65l.11.35H3.5a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5h-1.632l.11-.35A.5.5 0 0 0 10.5 1zm.68 1h3.64l-.313 1H6.493zM11 7H5V6h6zm0 2.5H5v-1h6zM5 12h4v-1H5z" clip-rule="evenodd" />
</svg>`,
    },
    {
      name: "Account Management",
      href: "/admin/account-management",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" {...$$props}>
	<path fill="currentColor" d="M11 10v2H9v2H7v-2H5.8c-.4 1.2-1.5 2-2.8 2c-1.7 0-3-1.3-3-3s1.3-3 3-3c1.3 0 2.4.8 2.8 2zm-8 0c-.6 0-1 .4-1 1s.4 1 1 1s1-.4 1-1s-.4-1-1-1m13 4c2.7 0 8 1.3 8 4v2H8v-2c0-2.7 5.3-4 8-4m0-2c-2.2 0-4-1.8-4-4s1.8-4 4-4s4 1.8 4 4s-1.8 4-4 4" />
</svg>`,
    },
    {
      name: "Sign Out",
      href: "/signout",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" {...$$props}>
	<path fill="currentColor" d="M17 2H7C5.3 2 4 3.3 4 5v6h8.6l-2.3-2.3c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l4 4c.4.4.4 1 0 1.4l-4 4c-.4.4-1 .4-1.4 0s-.4-1 0-1.4l2.3-2.3H4v6c0 1.7 1.3 3 3 3h10c1.7 0 3-1.3 3-3V5c0-1.7-1.3-3-3-3" />
</svg>`,
    },
  ];

  if (userRole === "superadmin") {
    navigation = [
      ...navigation.slice(0, -1),
      {
        name: "Admin Permissions",
        href: "/admin/permissions",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5zm0 11h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>`,
      },
      navigation[navigation.length - 1],
    ];
  }

  // Filter navigation based on permissions for admin
  $: if (userRole === "admin") {
    const permissions = $page.data.permissions || [];
    navigation = navigation.filter(
      (item) =>
        item.href === "/admin/dashboard" || // Always show dashboard
        item.href === "/signout" || // Always show sign out
        permissions.includes(item.href) // Show if permitted
    );
  }

  let isNavigating = false;

  async function handleNavigation(path) {
    if (isNavigating) return; // Prevent multiple clicks

    try {
      isNavigating = true;
      await goto(path);
      // Close sidebar after navigation completes (mobile only)
      if (window.innerWidth < 1024) {
        // 1024px is the lg breakpoint
        showSidebar = false;
      }
    } catch (error) {
      console.error("Navigation error:", error);
    } finally {
      // Reset after a delay to prevent immediate re-clicks
      setTimeout(() => {
        isNavigating = false;
      }, 1000);
    }
  }
</script>

<!-- Main container with gradient background -->
<div
  class="flex h-screen overflow-hidden bg-gradient-to-br from-background to-background/90 text-foreground"
>
  <!-- Overlay for mobile nav -->
  {#if showSidebar}
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
      on:click={() => (showSidebar = false)}
    />
  {/if}

  <!-- Redesigned Sidebar -->
  <aside
    class="{showSidebar
      ? 'fixed inset-0 z-50 w-[280px] translate-x-0'
      : 'fixed inset-0 z-50 w-[280px] -translate-x-full'} lg:relative lg:block lg:w-72 lg:translate-x-0 bg-gradient-to-b from-primary to-primary-dark text-white shadow-xl transition-transform duration-300 ease-in-out rounded-r-xl text-sm"
  >
    <div class="sticky top-0 h-screen flex flex-col">
      <!-- Logo and title area -->
      <div
        class="p-6 border-b border-white/10 flex items-center justify-center"
      >
        <h1 class="text-sm font-bold tracking-tight">
          {#if userRole === "admin"}
            Admin Panel
          {:else if userRole === "superadmin"}
            SuperAdmin Panel
          {:else}
            JOMS Panel
          {/if}
        </h1>
      </div>

      <!-- User profile section -->
      {#if $page.data.profile}
        <div class="px-6 py-4 border-b border-white/10">
          <div class="flex items-center gap-4">
            <div
              class="bg-accent text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold shadow-md border-2 border-white/20"
            >
              {$page.data.profile.first_name.charAt(
                0
              )}{$page.data.profile.last_name.charAt(0)}
            </div>
            <div>
              <div class="font-medium text-white">
                {$page.data.profile.first_name}
                {$page.data.profile.last_name}
              </div>
              {#if $page.data.session?.user?.email}
                <div class="text-xs text-white/80 truncate max-w-[180px]">
                  {$page.data.session.user.email}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Navigation menu -->
      <nav class="flex-1 overflow-y-auto p-4">
        <ul class="space-y-1">
          {#each navigation as navItem}
            {@const isActive =
              $page.url.pathname.endsWith(navItem.href) ||
              $page.url.pathname === navItem.href}
            <li>
              <button
                on:click={() => handleNavigation(navItem.href)}
                disabled={isNavigating}
                class="w-full text-left rounded-lg p-3
                relative overflow-hidden group
                transition-all duration-200 ease-in-out
                hover:bg-white/10
                {isActive ? 'bg-white/15' : ''}
                {isNavigating ? 'opacity-50 cursor-not-allowed' : ''}"
              >
                <div class="flex items-center gap-3 whitespace-nowrap">
                  <span
                    class="text-white/90 transition-transform duration-200
                    {isActive ? 'text-accent' : ''}
                    {isNavigating && isActive ? 'animate-spin' : ''}"
                  >
                    {#if isNavigating && isActive}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1.2em"
                        height="1.2em"
                        viewBox="0 0 24 24"
                      >
                        <defs>
                          <linearGradient
                            id="mingcuteLoadingFill0"
                            x1="50%"
                            x2="50%"
                            y1="5.271%"
                            y2="91.793%"
                          >
                            <stop offset="0%" stop-color="currentColor" />
                            <stop
                              offset="100%"
                              stop-color="currentColor"
                              stop-opacity="0.55"
                            />
                          </linearGradient>
                          <linearGradient
                            id="mingcuteLoadingFill1"
                            x1="50%"
                            x2="50%"
                            y1="15.24%"
                            y2="87.15%"
                          >
                            <stop
                              offset="0%"
                              stop-color="currentColor"
                              stop-opacity="0"
                            />
                            <stop
                              offset="100%"
                              stop-color="currentColor"
                              stop-opacity="0.55"
                            />
                          </linearGradient>
                        </defs>
                        <g fill="none">
                          <path
                            d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"
                          />
                          <path
                            fill="url(#mingcuteLoadingFill0)"
                            d="M8.749.021a1.5 1.5 0 0 1 .497 2.958A7.5 7.5 0 0 0 3 10.375a7.5 7.5 0 0 0 7.5 7.5v3c-5.799 0-10.5-4.7-10.5-10.5C0 5.23 3.726.865 8.749.021"
                            transform="translate(1.5 1.625)"
                          />
                          <path
                            fill="url(#mingcuteLoadingFill1)"
                            d="M15.392 2.673a1.5 1.5 0 0 1 2.119-.115A10.48 10.48 0 0 1 21 10.375c0 5.8-4.701 10.5-10.5 10.5v-3a7.5 7.5 0 0 0 5.007-13.084a1.5 1.5 0 0 1-.115-2.118"
                            transform="translate(1.5 1.625)"
                          />
                        </g>
                      </svg>
                    {:else}
                      {@html navItem.icon}
                    {/if}
                  </span>
                  <span
                    class="transition-colors duration-200 font-medium {isActive
                      ? 'text-white'
                      : 'text-white/80'}"
                  >
                    {navItem.name}
                  </span>
                </div>

                {#if isActive}
                  <div
                    class="absolute top-0 left-0 h-full w-1 bg-accent rounded-r animate-pulse"
                  />
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
  </aside>

  <!-- Content wrapper -->
  <div
    class="flex-1 flex flex-col lg:relative bg-white/5 backdrop-blur-sm rounded-l-xl shadow-inner"
  >
    <!-- Mobile Header -->
    <div
      class="lg:hidden flex items-center justify-between bg-primary/95 text-white p-4 w-full shadow-md"
    >
      <div>
        <div class="font-bold text-lg flex items-center gap-2">
          <button
            class="p-2 rounded-full hover:bg-primary-dark/50 transition-colors"
            on:click={() => (showSidebar = !showSidebar)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.5em"
              height="1.5em"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M3 18h18v-2H3zm0-5h18v-2H3zm0-5h18V6H3z"
              />
            </svg>
          </button>

          {#if $page.data.profile}
            <div
              class="bg-accent text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-white/20"
            >
              {$page.data.profile.first_name.charAt(
                0
              )}{$page.data.profile.last_name.charAt(0)}
            </div>
          {/if}

          <div class="ml-2">
            <div>
              {#if userRole === "admin"}
                Admin Panel
              {:else if userRole === "superadmin"}
                SuperAdmin Panel
              {:else}
                JOMS Panel
              {/if}
            </div>
            {#if $page.data.profile}
              <div class="text-xs opacity-80">
                {$page.data.profile.first_name}
                {$page.data.profile.last_name}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Scrollable content area -->
    <main class="flex-1 overflow-y-auto p-0 max-w-[100vw] lg:px-8">
      <slot />
    </main>
  </div>
</div>

<style>
  /* Enhanced animations */
  aside {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  button:disabled {
    cursor: not-allowed;
  }

  @keyframes slideDown {
    from {
      height: 0%;
    }
    to {
      height: 100%;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-slideDown {
    animation: slideDown 0.3s ease-out forwards;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
