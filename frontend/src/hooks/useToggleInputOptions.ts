import { useCallback, useEffect, useRef, useState } from "react";

interface UseToggleInputOptions {
    onToggle?: (isOpen: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
}

export function useToggleInput(options: UseToggleInputOptions = {}) {
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const toggle = useCallback(() => {
        setIsOpen((prev) => {
            const newState = !prev;
            if (newState) {
                options.onOpen?.();
            } else {
                options.onClose?.();
            }
            options.onToggle?.(newState);
            return newState;
        });
    }, [options]);

    const open = useCallback(() => {
        setIsOpen(true);
        options.onOpen?.();
        options.onToggle?.(true);
    }, [options]);

    const hide = useCallback(() => {
        setIsOpen(false);
        options.onClose?.();
        options.onToggle?.(false);
    }, [options]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return {
        isOpen,
        inputRef,
        toggle,
        open,
        hide,
    };
}
