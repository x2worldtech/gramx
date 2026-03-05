import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useTranslation } from "../i18n/useTranslation";

export default function AuthScreen() {
  const { login, loginStatus, isInitializing } = useInternetIdentity();
  const { t } = useTranslation();

  const isLoggingIn = loginStatus === "logging-in" || isInitializing;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-background">
      <motion.div
        className="w-full max-w-sm flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-ios">
            <img
              src="/assets/generated/gramx-logo-transparent.dim_200x200.png"
              alt="GramX Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              GramX
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth_tagline")}
            </p>
          </div>
        </div>

        {/* Login button */}
        <div className="w-full flex flex-col items-center gap-4">
          <p className="text-sm text-center text-muted-foreground leading-relaxed">
            {t("auth_login_description")}
          </p>
          <Button
            data-ocid="auth.login_button"
            className="w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            onClick={login}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth_signing_in")}
              </>
            ) : (
              t("auth_login_button")
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
