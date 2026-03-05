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
    <div
      className="flex-1 flex flex-col items-center justify-center"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#000c1a",
      }}
    >
      {/* ── Animated background layers ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* Deep black base */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#04060f",
          }}
        />

        {/* Radial blue center glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 90% 70% at 50% 42%, rgba(10,50,180,0.35) 0%, transparent 70%)",
          }}
        />

        {/* Orb 1 — vivid blue, top-right */}
        <div
          className="auth-orb-1"
          style={{
            position: "absolute",
            top: "-25%",
            right: "-20%",
            width: "70%",
            height: "70%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(30,100,255,0.50) 0%, rgba(10,50,180,0.22) 50%, transparent 72%)",
            filter: "blur(2px)",
          }}
        />

        {/* Orb 2 — deep blue, bottom-left */}
        <div
          className="auth-orb-2"
          style={{
            position: "absolute",
            bottom: "-30%",
            left: "-25%",
            width: "75%",
            height: "75%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(20,80,220,0.40) 0%, rgba(5,30,120,0.18) 52%, transparent 72%)",
            filter: "blur(3px)",
          }}
        />

        {/* Orb 3 — white/blue soft center pulse */}
        <div
          className="auth-orb-3 auth-pulse"
          style={{
            position: "absolute",
            top: "28%",
            left: "22%",
            width: "56%",
            height: "56%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(180,210,255,0.07) 0%, transparent 65%)",
            filter: "blur(1px)",
          }}
        />

        {/* White shimmer top edge */}
        <div
          className="auth-pulse"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.30) 30%, rgba(160,210,255,0.55) 50%, rgba(255,255,255,0.30) 70%, transparent 100%)",
          }}
        />

        {/* White shimmer bottom edge */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.10) 60%, transparent 100%)",
          }}
        />

        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(80,140,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(80,140,255,0.035) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 85% 65% at 50% 50%, black 15%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Content ── */}
      <motion.div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "340px",
          padding: "0 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      >
        {/* GramX wordmark */}
        <h1
          style={{
            fontSize: "clamp(3.2rem, 10vw, 4.2rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "#ffffff",
            fontFamily: "Sora, sans-serif",
            textShadow:
              "0 0 40px rgba(80,160,255,0.5), 0 2px 0 rgba(0,0,0,0.4)",
            marginBottom: "8px",
          }}
        >
          Gram<span style={{ color: "#4d9fff" }}>X</span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "13px",
            color: "rgba(220, 235, 255, 0.55)",
            marginBottom: "48px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "Sora, sans-serif",
            fontWeight: 500,
          }}
        >
          {t("auth_tagline")}
        </p>

        {/* White divider line — accent */}
        <div
          style={{
            width: "100%",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 20%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.18) 80%, transparent 100%)",
            marginBottom: "36px",
          }}
        />

        {/* Login section */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              textAlign: "center",
              color: "rgba(200, 220, 255, 0.55)",
              lineHeight: "1.65",
              fontFamily: "Sora, sans-serif",
              letterSpacing: "0.01em",
            }}
          >
            {t("auth_login_description")}
          </p>

          <Button
            data-ocid="auth.login_button"
            onClick={login}
            disabled={isLoggingIn}
            style={{
              width: "100%",
              height: "52px",
              fontSize: "15px",
              fontWeight: 700,
              fontFamily: "Sora, sans-serif",
              borderRadius: "16px",
              background: isLoggingIn
                ? "rgba(30,80,180,0.5)"
                : "linear-gradient(135deg, #2b7fff 0%, #0055ee 45%, #0033aa 100%)",
              color: "#ffffff",
              border: "none",
              boxShadow: isLoggingIn
                ? "none"
                : "0 6px 28px rgba(0,80,255,0.45), 0 1px 0 rgba(255,255,255,0.12) inset",
              transition: "all 0.2s ease",
              letterSpacing: "0.02em",
            }}
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
