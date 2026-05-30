import { useState } from "react";

export function useStoryAdvancedSettings() {
    const [allowReplies, setAllowReplies] = useState(true);
    const [allowSharing, setAllowSharing] = useState(true);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showMusicPicker, setShowMusicPicker] = useState(false);

    return {
        allowReplies,
        setAllowReplies,
        allowSharing,
        setAllowSharing,
        showAdvancedSettings,
        setShowAdvancedSettings,
        showSidebar,
        setShowSidebar,
        showMusicPicker,
        setShowMusicPicker,
    };
}
