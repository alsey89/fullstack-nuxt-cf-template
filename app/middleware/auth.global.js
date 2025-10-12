// middleware/auth.global.ts

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession();

  const publicPaths = [
    "/auth/signin",
    "/auth/signup",
    "/auth/signout",
    "/auth/password/reset",
    "/auth/password/reset/request",
  ];

  if (publicPaths.includes(to.path)) {
    return;
  }

  if (!loggedIn.value) {
    return navigateTo({
      path: "/auth/signin",
      query: {
        redirectTo: to.fullPath,
        toast: "authRequired",
      },
    });
  }
});
