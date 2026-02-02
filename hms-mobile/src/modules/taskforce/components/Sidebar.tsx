import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
} from "react-native";
import {
    Home,
    PlusCircle,
    List,
    Clock,
    Settings,
    X,
    ChevronRight,
    ShieldCheck,
    LogOut,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../../theme";
import { useAuthContext } from "../../../auth/AuthProvider";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.75;

interface SidebarProps {
    isVisible: boolean;
    onClose: () => void;
    navigation: any;
}

export default function Sidebar({ isVisible, onClose, navigation }: SidebarProps) {
    const { logout } = useAuthContext();
    const insets = useSafeAreaInsets();
    const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

    React.useEffect(() => {
        if (isVisible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -SIDEBAR_WIDTH,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [isVisible]);

    const navigateTo = (screen: string) => {
        onClose();
        navigation.navigate(screen);
    };

    const handleLogout = async () => {
        onClose();
        await logout();
    };

    return (
        <Modal
            transparent
            visible={isVisible}
            onRequestClose={onClose}
            animationType="none"
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.sidebar,
                        { transform: [{ translateX: slideAnim }], paddingTop: (insets.top || 0) + 20 },
                    ]}
                >
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.moduleName}>Taskforce</Text>
                            <Text style={styles.subText}>CTU / GVP Transformation</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#0f172a" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.menuItems}>
                        <MenuItem
                            icon={<Home size={22} color="#0f172a" />}
                            label="Dashboard"
                            onPress={() => navigateTo("TaskforceHome")}
                        />
                        <MenuItem
                            icon={<PlusCircle size={22} color="#0f172a" />}
                            label="Request Feeder"
                            onPress={() => navigateTo("TaskforceRegister")}
                        />
                        <MenuItem
                            icon={<List size={22} color="#0f172a" />}
                            label="Assigned Feeders"
                            onPress={() => navigateTo("TaskforceAssigned")}
                        />
                        <MenuItem
                            icon={<Clock size={22} color="#0f172a" />}
                            label="My Requests"
                            onPress={() => navigateTo("TaskforceMyRequests")}
                        />
                        <MenuItem
                            icon={<ShieldCheck size={22} color="#0f172a" />}
                            label="QC Reports"
                            onPress={() => navigateTo("TaskforceQcReports")}
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.footerItem}>
                            <Settings size={20} color="#64748b" />
                            <Text style={styles.footerText}>Settings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.footerItem, styles.logoutItem]} onPress={handleLogout}>
                            <LogOut size={20} color="#dc2626" />
                            <Text style={[styles.footerText, styles.logoutText]}>Logout</Text>
                        </TouchableOpacity>
                        <Text style={styles.version}>v0.12.4</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

function MenuItem({ icon, label, onPress }: any) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIcon}>{icon}</View>
            <Text style={styles.menuLabel}>{label}</Text>
            <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: "row",
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        backgroundColor: "#ffffff",
        height: "100%",
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 5, height: 0 },
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 40,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    moduleName: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0f172a",
    },
    subText: {
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    menuItems: {
        flex: 1,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 4,
    },
    menuIcon: {
        width: 40,
        alignItems: "center",
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        color: "#0f172a",
        marginLeft: 8,
    },
    footer: {
        paddingBottom: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
    footerItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },
    logoutItem: {
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: "#fef2f2",
        paddingTop: 10,
    },
    footerText: {
        fontSize: 14,
        color: "#64748b",
        fontWeight: "600",
    },
    logoutText: {
        color: "#dc2626",
    },
    version: {
        fontSize: 12,
        color: "#94a3b8",
        marginTop: 10,
    },
});
