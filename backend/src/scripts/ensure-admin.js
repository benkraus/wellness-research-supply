const { ContainerRegistrationKeys, Modules } = require("@medusajs/framework/utils");

exports.default = async function ensureAdmin({ container }) {
  const email = (process.env.MEDUSA_ADMIN_EMAIL || "").trim();
  const password = (process.env.MEDUSA_ADMIN_PASSWORD || "").trim();

  if (!email || !password) {
    return;
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userService = container.resolve(Modules.USER);
  const authService = container.resolve(Modules.AUTH);

  try {
    const existingUsers = await userService.listUsers({ email });
    const user = existingUsers.length
      ? existingUsers[0]
      : await userService.createUsers({ email });

    const registerResult = await authService.register("emailpass", {
      body: {
        email,
        password,
      },
    });

    if (registerResult.error) {
      if (registerResult.error === "Identity with email already exists") {
        const providerService = authService.getAuthIdentityProviderService("emailpass");
        const existingAuthIdentity = await providerService.retrieve({
          entity_id: email,
        });
        const currentUserId = existingAuthIdentity?.app_metadata?.user_id;

        if (currentUserId && currentUserId !== user.id) {
          logger.error(
            `Auth identity for ${email} is linked to a different user (${currentUserId}).`
          );
          return;
        }

        if (!currentUserId) {
          await authService.updateAuthIdentities({
            id: existingAuthIdentity.id,
            app_metadata: {
              ...(existingAuthIdentity.app_metadata ?? {}),
              user_id: user.id,
            },
          });
        }

        logger.info(`Admin auth identity verified for ${email}`);
        return;
      }

      logger.error(registerResult.error);
      return;
    }

    await authService.updateAuthIdentities({
      id: registerResult.authIdentity.id,
      app_metadata: {
        ...(registerResult.authIdentity.app_metadata ?? {}),
        user_id: user.id,
      },
    });

    logger.info(`Admin user ensured for ${email}`);
  } catch (error) {
    const message =
      typeof error?.message === "string" ? error.message : String(error);

    if (message.includes('relation "user" does not exist')) {
      logger.warn(
        "Admin bootstrap skipped because the database is not initialized yet."
      );
      return;
    }

    logger.error("Failed to ensure admin user", error);
  }
};
