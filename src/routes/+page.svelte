<script>
  import { enhance } from "$app/forms";

  let username = "";
  let password = "";
  let showPassword = false;
  let loginError = "";
  let loading = false;

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  const handleEnhance = () => {
    loading = true;
    return async ({ result }) => {
      if (result.type === "success" || result.type === "redirect") {
        window.location.href = result.location || "/";
        return;
      }

      if (result.type === "failure") {
        loginError = result.data?.error || "Failed to sign in";
      }
      loading = false;
    };
  };
</script>

<div class="min-h-screen bg-gray-50">
  <div class="flex min-h-screen">
    <!-- Left panel with softer background -->
    <div class="hidden md:flex md:w-[40%] bg-secondary relative">
      <div
        class="relative z-10 flex flex-col justify-center items-center p-12 text-gray-800"
      >
        <img
          src="./RichRedHorizontal.png"
          alt="RichRed Clotheshoppe"
          class="w-3/4 mb-8"
        />
        <h1 class="text-3xl font-bold mb-4 text-primary">Welcome</h1>
        <p class="text-lg mb-6 text-center text-white">
          Access the Point of Sale System
        </p>
      </div>
    </div>

    <!-- Right panel with login form -->
    <div class="w-full md:w-[60%] flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <!-- Mobile-only logo -->
        <div class="flex justify-center mb-8 md:hidden">
          <img
            src="./RichRedHorizontal.png"
            alt="RichRed Clotheshoppe"
            class="w-3/4 h-auto"
          />
        </div>

        <div class="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-800 text-center">
              SIGN IN
            </h2>
            <p class="text-gray-600 text-sm mt-2 text-center">
              This system is exclusively for RichRed Clotheshoppe employees
            </p>
          </div>

          {#if loginError}
            <div
              class="bg-error-light border border-error text-error px-4 py-3 rounded-lg relative mb-6 animate-slideDown"
              role="alert"
            >
              <span class="block sm:inline">{loginError}</span>
            </div>
          {/if}

          <form
            class="space-y-6"
            method="POST"
            action="?/signin"
            use:enhance={handleEnhance}
          >
            <div>
              <label
                for="username"
                class="block text-sm font-medium text-gray-700 mb-1"
                >Username</label
              >
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  bind:value={username}
                  class="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 text-foreground focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div class="relative">
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-1"
                >Password</label
              >
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                {#if showPassword}
                  <input
                    type="text"
                    id="password"
                    name="password"
                    bind:value={password}
                    class="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 text-foreground focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                    placeholder="Enter your password"
                    required
                  />
                {:else}
                  <input
                    type="password"
                    id="password"
                    name="password"
                    bind:value={password}
                    class="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 text-foreground focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                    placeholder="Enter your password"
                    required
                  />
                {/if}
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center focus-visible:outline-none"
                  on:click={togglePasswordVisibility}
                >
                  {#if showPassword}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 text-gray-500 hover:text-secondary"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fill-rule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 text-gray-500 hover:text-secondary"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clip-rule="evenodd"
                      />
                      <path
                        d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"
                      />
                    </svg>
                  {/if}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full bg-secondary text-white py-3 rounded-lg font-semibold hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {#if loading}
                <svg
                  class="animate-spin h-5 w-5 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              {:else}
                Log in
              {/if}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-gray-500">
            <p class="mt-4 text-primary text-xs">
              POS RichRed Clotheshoppe V1
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
