<script>
  import "../app.css";
  import { page } from "$app/stores";
  import { injectAnalytics } from '@vercel/analytics/sveltekit'

  $: metaData = {
    "/": {
      title: "Sign In | RichRed Clotheshoppe JOMS",
      description:
      "Secure login portal for RichRed Clotheshoppe's comprehensive job order management system. Access tailoring services, order tracking and uniform management tools.",
      keywords: "RichRed JOMS, login, sign in, uniform management",
    },
    "/employee/orders": {
      title: "Tailor Orders | RichRed Clotheshoppe JOMS",
      description:
      "Comprehensive order list management interface for RichRed Clotheshoppe staff. View, sort, and process customer uniform orders efficiently.",
      keywords: "RichRed JOMS, orders, uniform orders, order management",
    },
    "/employee/dashboard": {
      title: "Tailor Dashboard | RichRed Clotheshoppe JOMS",
      description:
      "Central dashboard for RichRed Clotheshoppe staff to monitor orders, track metrics, and manage daily tasks efficiently.",
      keywords: "RichRed JOMS, dashboard, tailor dashboard, tasks",
    },
    "/employee/students": {
      title: "Student Management | RichRed Clotheshoppe JOMS",
      description:
      "Manage and access student uniform records, measurements, and order history for RichRed Clotheshoppe uniform services.",
      keywords: "RichRed JOMS, students, measurements, uniforms",
    },
    "/employee/profile": {
      title: "Tailor Profile | RichRed Clotheshoppe JOMS",
      description:
      "Manage your RichRed Clotheshoppe staff profile, view work history, and update personal information.",
      keywords: "RichRed JOMS, profile, tailor profile, staff",
    },
    "/admin/dashboard": {
      title: "Admin Dashboard | RichRed Clotheshoppe JOMS",
      description:
      "Comprehensive analytics dashboard for RichRed Clotheshoppe administrators. Monitor orders, revenue, student demographics and tailor performance metrics.",
      keywords: "RichRed JOMS, admin dashboard, analytics, metrics",
    },
    "/admin/tailor-performance": {
      title: "Tailor Performance | RichRed Clotheshoppe JOMS",
      description:
      "Track and analyze tailor productivity, completion rates, order quality and efficiency metrics for RichRed Clotheshoppe staff.",
      keywords: "RichRed JOMS, tailor performance, metrics, productivity",
    },
    "/admin/course": {
      title: "Course Management | RichRed Clotheshoppe JOMS",
      description:
      "Manage academic programs and courses for RichRed Clotheshoppe uniform system. Add, edit and organize student course information.",
      keywords: "RichRed JOMS, courses, programs, academic",
    },
    "/admin/measurement": {
      title: "Measurement Types | RichRed Clotheshoppe JOMS",
      description:
      "Configure and manage uniform measurement specifications and standards for RichRed Clotheshoppe tailoring system.",
      keywords: "RichRed JOMS, measurements, specifications, standards",
    },
    "/admin/uniform-configuration": {
      title: "Uniform Configuration | RichRed Clotheshoppe JOMS",
      description:
      "Set up and manage uniform specifications, pricing, and measurement requirements by course and gender.",
      keywords: "RichRed JOMS, uniform config, specifications, pricing",
    },
    "/admin/account-management": {
      title: "Account Management | RichRed Clotheshoppe JOMS",
      description:
      "Manage staff accounts, roles and access permissions for RichRed Clotheshoppe JOMS platform.",
      keywords: "RichRed JOMS, accounts, roles, permissions",
    },
    "/admin/orders": {
      title: "Order Management | RichRed Clotheshoppe JOMS",
      description:
      "Central order management system for processing uniform orders, tracking status and managing tailor assignments.",
      keywords: "RichRed JOMS, orders, tracking, management",
    },
    "/admin/students": {
      title: "Student Management | RichRed Clotheshoppe JOMS",
      description:
      "Manage student profiles, measurements and uniform orders for RichRed Clotheshoppe system.",
      keywords: "RichRed JOMS, students, profiles, uniforms",
    },
  }[$page.url.pathname];
</script>

<svelte:head>
  <title>{metaData?.title || "RichRed Clotheshoppe JOMS"}</title>
  <meta name="description" content={metaData?.description} />
  <meta name="keywords" content={metaData?.keywords} />

  <!-- Add Open Graph tags -->
  <meta property="og:title" content={metaData?.title} />
  <meta property="og:description" content={metaData?.description} />
  <meta property="og:type" content="website" />
  <meta
    property="og:url"
    content={`https://richred.vercel.app${$page.url.pathname}`}
  />

  <!-- Add Twitter Card tags -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={metaData?.title} />
  <meta name="twitter:description" content={metaData?.description} />

  <!-- Add canonical URL -->
  <link
    rel="canonical"
    href={`https://richred.vercel.app${$page.url.pathname}`}
  />

  <!-- Add structured data -->
  {@html `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "${metaData?.title}",
        "description": "${metaData?.description}",
        "url": "https://richred.vercel.app${$page.url.pathname}"
      }
      </script>
    `}
</svelte:head>
<slot />
