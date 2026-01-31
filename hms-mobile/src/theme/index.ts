export const Colors = {
    primary: "#1e3a8a", // Deep Blue
    primaryLight: "#dbeafe",
    secondary: "#64748b",
    background: "#f8fafc",
    card: "#ffffff",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0",
    success: "#16a34a",
    successBg: "#dcfce7",
    successLight: "#bbf7d0",
    danger: "#dc2626",
    dangerBg: "#fee2e2",
    error: "#dc2626",
    errorLight: "#fecaca",
    warning: "#ca8a04",
    warningBg: "#fef9c3",
    warningLight: "#fef08a",
    info: "#3b82f6",
    infoLight: "#bfdbfe",
    white: "#ffffff",
    inputBg: "#ffffff",
};

export const Spacing = {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
};

export const Typography = {
    h1: { fontSize: 24, fontWeight: "700" as "700", color: Colors.text },
    h2: { fontSize: 20, fontWeight: "600" as "600", color: Colors.text },
    h3: { fontSize: 16, fontWeight: "600" as "600", color: Colors.text },
    body: { fontSize: 14, color: Colors.text },
    bodyBold: { fontSize: 14, fontWeight: "600" as "600", color: Colors.text },
    muted: { fontSize: 14, color: Colors.textMuted },
    caption: { fontSize: 12, color: Colors.textMuted },
};

export const Layout = {
    card: {
        backgroundColor: Colors.card,
        borderRadius: 12,
        padding: Spacing.m,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    screenContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.l,
    },
};

export const UI = {
    button: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center" as "center",
        justifyContent: "center" as "center",
    },
    buttonPrimary: {
        backgroundColor: Colors.primary,
    },
    buttonTextPrimary: {
        color: Colors.white,
        fontWeight: "600" as "600",
        fontSize: 16,
    },
    buttonSecondary: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    buttonTextSecondary: {
        color: Colors.primary,
        fontWeight: "600" as "600",
        fontSize: 16,
    },
};
