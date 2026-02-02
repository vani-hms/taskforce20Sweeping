import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, ArrowLeft } from "lucide-react-native";
import Sidebar from "./Sidebar";

interface TaskforceLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    navigation: any;
    showBack?: boolean;
}

export default function TaskforceLayout({
    children,
    title,
    subtitle,
    navigation,
    showBack = false
}: TaskforceLayoutProps) {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate("TaskforceHome");
        }
    };

    return (
        <View style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent />
            <View style={styles.container}>
                <View style={[
                    styles.header,
                    { paddingTop: (insets.top || 0) + 12 }
                ]}>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => showBack ? handleBack() : setIsSidebarVisible(true)}
                    >
                        {showBack ? (
                            <ArrowLeft size={24} color="#0f172a" strokeWidth={2.5} />
                        ) : (
                            <Menu size={24} color="#0f172a" strokeWidth={2.5} />
                        )}
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
                    </View>
                </View>

                <View style={styles.content}>
                    {children}
                </View>

                <Sidebar
                    isVisible={isSidebarVisible}
                    onClose={() => setIsSidebarVisible(false)}
                    navigation={navigation}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        shadowColor: "#0f172a",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 2,
    },
    menuBtn: {
        padding: 8,
        marginRight: 12,
        borderRadius: 12,
        backgroundColor: "#f8fafc",
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0f172a",
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: "500",
        marginTop: 1,
    },
    content: {
        flex: 1,
    },
});
