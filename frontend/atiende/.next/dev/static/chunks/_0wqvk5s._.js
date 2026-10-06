(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/chat/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ModeSwitch$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ModeSwitch.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Chat.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backend.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/realtime.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function ChatPage() {
    _s();
    const [actors, setActors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedActor, setSelectedActor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('demo-customer-1');
    const [isConnecting, setIsConnecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sessionRole, setSessionRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [currentThreadId, setCurrentThreadId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isTyping, setIsTyping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [systemAlert, setSystemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [problemAlert, setProblemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const streamingMsgIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const streamingTextRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])('');
    const hasInitializedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const onSnapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[onSnapshot]": (snapshot)=>{
            if (snapshot?.threadId) {
                setCurrentThreadId(snapshot.threadId);
            }
            if (Array.isArray(snapshot?.messages)) {
                setMessages({
                    "ChatPage.useCallback[onSnapshot]": (prev)=>{
                        // Merge snapshot.messages with prev, preserving user typed text if snapshot content is sanitized
                        return snapshot.messages.map({
                            "ChatPage.useCallback[onSnapshot]": (sMsg, idx)=>{
                                if (sMsg.role === 'customer' && sMsg.content?.includes('[Mensaje de cliente recibido')) {
                                    const localMatch = prev[idx] || prev.find({
                                        "ChatPage.useCallback[onSnapshot]": (m)=>m.messageId === sMsg.messageId
                                    }["ChatPage.useCallback[onSnapshot]"]);
                                    if (localMatch && localMatch.content && !localMatch.content.includes('[Mensaje de cliente recibido')) {
                                        return {
                                            ...sMsg,
                                            content: localMatch.content
                                        };
                                    }
                                }
                                return sMsg;
                            }
                        }["ChatPage.useCallback[onSnapshot]"]);
                    }
                }["ChatPage.useCallback[onSnapshot]"]);
            }
        }
    }["ChatPage.useCallback[onSnapshot]"], []);
    const onStateChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[onStateChange]": ({ status })=>{
            if (status === 'generating' || status === 'deciding' || status === 'normalizing' || status === 'queued') {
                setIsTyping(true);
            } else if (status === 'completed' || status === 'pending_approval' || status === 'failed') {
                setIsTyping(false);
            }
        }
    }["ChatPage.useCallback[onStateChange]"], []);
    const onDelta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[onDelta]": ({ messageId, value })=>{
            setIsTyping(true);
            if (streamingMsgIdRef.current !== messageId) {
                streamingMsgIdRef.current = messageId;
                streamingTextRef.current = value;
                setMessages({
                    "ChatPage.useCallback[onDelta]": (prev)=>{
                        if (prev.some({
                            "ChatPage.useCallback[onDelta]": (m)=>m.messageId === messageId
                        }["ChatPage.useCallback[onDelta]"])) {
                            return prev.map({
                                "ChatPage.useCallback[onDelta]": (m)=>m.messageId === messageId ? {
                                        ...m,
                                        content: value
                                    } : m
                            }["ChatPage.useCallback[onDelta]"]);
                        }
                        return [
                            ...prev,
                            {
                                messageId,
                                role: 'assistant',
                                content: value,
                                attachments: [],
                                createdAt: new Date().toISOString()
                            }
                        ];
                    }
                }["ChatPage.useCallback[onDelta]"]);
            } else {
                streamingTextRef.current += value;
                const updatedContent = streamingTextRef.current;
                setMessages({
                    "ChatPage.useCallback[onDelta]": (prev)=>prev.map({
                            "ChatPage.useCallback[onDelta]": (m)=>m.messageId === messageId ? {
                                    ...m,
                                    content: updatedContent
                                } : m
                        }["ChatPage.useCallback[onDelta]"])
                }["ChatPage.useCallback[onDelta]"]);
            }
        }
    }["ChatPage.useCallback[onDelta]"], []);
    const onCompleted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[onCompleted]": ({ response })=>{
            setIsTyping(false);
            if (streamingMsgIdRef.current) {
                const msgId = streamingMsgIdRef.current;
                setMessages({
                    "ChatPage.useCallback[onCompleted]": (prev)=>prev.map({
                            "ChatPage.useCallback[onCompleted]": (m)=>m.messageId === msgId ? {
                                    ...m,
                                    content: response
                                } : m
                        }["ChatPage.useCallback[onCompleted]"])
                }["ChatPage.useCallback[onCompleted]"]);
            } else {
                setMessages({
                    "ChatPage.useCallback[onCompleted]": (prev)=>{
                        if (prev.some({
                            "ChatPage.useCallback[onCompleted]": (m)=>m.content === response
                        }["ChatPage.useCallback[onCompleted]"])) return prev;
                        return [
                            ...prev,
                            {
                                messageId: `completed-${Date.now()}`,
                                role: 'assistant',
                                content: response,
                                attachments: [],
                                createdAt: new Date().toISOString()
                            }
                        ];
                    }
                }["ChatPage.useCallback[onCompleted]"]);
            }
            streamingMsgIdRef.current = null;
            streamingTextRef.current = '';
        }
    }["ChatPage.useCallback[onCompleted]"], []);
    const onAlert = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[onAlert]": ({ approvalId })=>{
            setSystemAlert(`Se ha requerido una aprobación humana (Approval ID: ${approvalId.slice(0, 8)}...). Un operador de backoffice revisará el caso.`);
        }
    }["ChatPage.useCallback[onAlert]"], []);
    const onProblem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[onProblem]": ({ code })=>{
            setIsTyping(false);
            setProblemAlert(`Se produjo un problema en la ejecución del backend (Código: ${code}).`);
        }
    }["ChatPage.useCallback[onProblem]"], []);
    const realtime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRealtime"])({
        enabled: true,
        onSnapshot,
        onStateChange,
        onDelta,
        onCompleted,
        onAlert,
        onProblem
    });
    const handleConnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[handleConnect]": async (actorToUse = selectedActor)=>{
            setIsConnecting(true);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createDemoSession"])(actorToUse);
            if (res.ok) {
                const meRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentSession"])();
                if (meRes.ok && meRes.data) {
                    setSessionRole(meRes.data.roles[0] || 'customer');
                }
                realtime.connect();
            } else {
                alert(`Error de autenticación demo: ${res.problem?.title || 'No se pudo crear la sesión'}`);
            }
            setIsConnecting(false);
        }
    }["ChatPage.useCallback[handleConnect]"], [
        selectedActor,
        realtime
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            if (hasInitializedRef.current) return;
            hasInitializedRef.current = true;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDemoActors"])().then({
                "ChatPage.useEffect": (res)=>{
                    if (res.ok && res.data) setActors(res.data);
                }
            }["ChatPage.useEffect"]);
            handleConnect('demo-customer-1');
        }
    }["ChatPage.useEffect"], [
        handleConnect
    ]);
    const handleSendMessage = (text, attachmentIds = [])=>{
        setProblemAlert(null);
        const userMessage = {
            messageId: `client-${Date.now()}`,
            role: 'customer',
            content: text || (attachmentIds.length > 0 ? `[${attachmentIds.length} adjunto(s)]` : ''),
            attachments: attachmentIds.map((id)=>({
                    attachmentId: id,
                    kind: 'image',
                    mediaType: 'image/png',
                    status: 'ready'
                })),
            createdAt: new Date().toISOString()
        };
        setMessages((prev)=>[
                ...prev,
                userMessage
            ]);
        setIsTyping(true);
        realtime.sendChat({
            clientMessageId: userMessage.messageId,
            text,
            threadId: currentThreadId || undefined,
            attachmentIds
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: 'var(--bg-color)'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ModeSwitch$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ModeSwitch"], {
                actors: actors,
                selectedActor: selectedActor,
                onSelectActor: (id)=>{
                    setSelectedActor(id);
                    handleConnect(id);
                },
                onConnect: ()=>handleConnect(),
                isConnecting: isConnecting,
                isConnected: realtime.isConnected,
                sessionRole: sessionRole
            }, void 0, false, {
                fileName: "[project]/app/chat/page.tsx",
                lineNumber: 182,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Chat"], {
                    messages: messages,
                    onSendMessage: handleSendMessage,
                    isTyping: isTyping,
                    systemAlert: systemAlert,
                    problemAlert: problemAlert,
                    isRealMode: true
                }, void 0, false, {
                    fileName: "[project]/app/chat/page.tsx",
                    lineNumber: 196,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/chat/page.tsx",
                lineNumber: 195,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/chat/page.tsx",
        lineNumber: 181,
        columnNumber: 5
    }, this);
}
_s(ChatPage, "dkwqFimqALDHPxq3NW3gma1woC8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRealtime"]
    ];
});
_c = ChatPage;
var _c;
__turbopack_context__.k.register(_c, "ChatPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/Chat.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Chat",
    ()=>Chat
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backend.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const Chat = ({ messages, onSendMessage, isTyping = false, systemAlert = null, problemAlert = null, placeholder = 'Escribe tu mensaje aquí... (Enter para enviar, Shift+Enter para nueva línea)', isRealMode = true })=>{
    _s();
    const [inputText, setInputText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [uploading, setUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [attachments, setAttachments] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const messagesEndRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const scrollToBottom = ()=>{
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        });
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Chat.useEffect": ()=>{
            scrollToBottom();
        }
    }["Chat.useEffect"], [
        messages,
        isTyping,
        systemAlert,
        problemAlert
    ]);
    const handleKeyDown = (e)=>{
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const handleSend = ()=>{
        const trimmed = inputText.trim();
        if (!trimmed && attachments.length === 0) return;
        const attachmentIds = attachments.map((a)=>a.attachmentId);
        onSendMessage(trimmed, attachmentIds);
        setInputText('');
        setAttachments([]);
    };
    const handleFileUpload = async (e)=>{
        const file = e.target.files?.[0];
        if (!file) return;
        if (attachments.length >= 3) {
            alert('Máximo 3 adjuntos por mensaje.');
            return;
        }
        setUploading(true);
        const kind = file.type.startsWith('audio') ? 'audio' : 'image';
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["uploadAttachment"])(file, kind);
        if (res.ok && res.data) {
            setAttachments((prev)=>[
                    ...prev,
                    {
                        attachmentId: res.data.attachmentId || `att-${Date.now()}`,
                        kind,
                        mediaType: file.type || 'image/png',
                        status: 'ready'
                    }
                ]);
        } else {
            alert(`Error al subir adjunto: ${res.problem?.title || 'Fallo desconocido'}`);
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const removeAttachment = (id)=>{
        setAttachments((prev)=>prev.filter((a)=>a.attachmentId !== id));
    };
    const suggestions = [
        '💳 Tengo un cobro no reconocido de 450 USD',
        '🚨 Solicito disputar la transacción rechazada',
        '🔒 Solicitar escalamiento a un operador humano',
        '📋 Consultar estado de mi caso de disputa'
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "chat-container",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "chat-messages",
                role: "log",
                "aria-label": "Mensajes de conversación",
                children: [
                    messages.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            padding: '2.5rem 1rem',
                            textAlign: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                style: {
                                    fontSize: '1.15rem',
                                    color: 'var(--text-ink)',
                                    marginBottom: '0.5rem',
                                    fontWeight: 700
                                },
                                children: "💬 Atención al Cliente Bankai"
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 103,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: '0.88rem',
                                    color: 'var(--text-muted)'
                                },
                                children: "Inicia la conversación escribiendo tu consulta a continuación..."
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 106,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 102,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    messages.map((msg, idx)=>{
                        const isUser = msg.role === 'customer';
                        const isBackoffice = msg.role === 'backoffice';
                        let bubbleClass = 'assistant';
                        if (isUser) bubbleClass = 'customer';
                        if (isBackoffice) bubbleClass = 'backoffice';
                        const displayContent = isUser && msg.content?.includes('[Mensaje de cliente recibido') ? '💬 Consulta de soporte enviada por el cliente' : msg.content;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `chat-bubble ${bubbleClass}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.72rem',
                                        opacity: 0.9,
                                        marginBottom: '0.25rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                    },
                                    children: isUser ? '👤 Cliente' : isBackoffice ? '👨‍💼 Operador de Backoffice (Humano)' : '🤖 Asistente AI'
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 127,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: 1.45
                                    },
                                    children: displayContent
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 135,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                msg.attachments && msg.attachments.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginTop: '0.5rem',
                                        display: 'flex',
                                        gap: '0.4rem',
                                        flexWrap: 'wrap'
                                    },
                                    children: msg.attachments.map((att, attIdx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem'
                                            },
                                            children: [
                                                "📎 ",
                                                att.kind === 'image' ? 'Imagen' : 'Audio',
                                                ": ",
                                                att.attachmentId.slice(0, 8)
                                            ]
                                        }, att.attachmentId ? `${att.attachmentId}-${attIdx}` : `att-${attIdx}`, true, {
                                            fileName: "[project]/components/Chat.tsx",
                                            lineNumber: 140,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)))
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 138,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.68rem',
                                        opacity: 0.65,
                                        marginTop: '0.3rem',
                                        textAlign: 'right'
                                    },
                                    children: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : ''
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 155,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, msg.messageId ? `${msg.messageId}-${idx}` : `msg-${idx}`, true, {
                            fileName: "[project]/components/Chat.tsx",
                            lineNumber: 126,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0));
                    }),
                    systemAlert && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-bubble system",
                        children: [
                            "⚠️ ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                children: "Aviso del Sistema:"
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 164,
                                columnNumber: 16
                            }, ("TURBOPACK compile-time value", void 0)),
                            " ",
                            systemAlert
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 163,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    problemAlert && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-bubble system-problem",
                        children: [
                            "🛑 ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                children: "Error del Backend:"
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 170,
                                columnNumber: 16
                            }, ("TURBOPACK compile-time value", void 0)),
                            " ",
                            problemAlert
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 169,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    isTyping && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "typing-indicator",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "El asistente está procesando tu solicitud..."
                        }, void 0, false, {
                            fileName: "[project]/components/Chat.tsx",
                            lineNumber: 176,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 175,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: messagesEndRef
                    }, void 0, false, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 180,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/Chat.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "chat-input-area",
                children: [
                    attachments.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "attachment-preview",
                        children: attachments.map((att)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "attachment-chip",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "📎 ",
                                            att.kind === 'image' ? 'Imagen' : 'Audio'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/Chat.tsx",
                                        lineNumber: 188,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>removeAttachment(att.attachmentId),
                                        type: "button",
                                        style: {
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--red-primary)'
                                        },
                                        children: "✕"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Chat.tsx",
                                        lineNumber: 189,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, att.attachmentId, true, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 187,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)))
                    }, void 0, false, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 185,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-form",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "file",
                                ref: fileInputRef,
                                onChange: handleFileUpload,
                                style: {
                                    display: 'none'
                                },
                                accept: "image/*,audio/*"
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 202,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "btn-secondary",
                                onClick: ()=>fileInputRef.current?.click(),
                                disabled: uploading || attachments.length >= 3,
                                type: "button",
                                title: "Adjuntar imagen o audio (máx 3)",
                                style: {
                                    padding: '0.65rem',
                                    minWidth: '42px'
                                },
                                children: uploading ? '...' : '📎'
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 209,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                className: "chat-input",
                                value: inputText,
                                onChange: (e)=>setInputText(e.target.value),
                                onKeyDown: handleKeyDown,
                                placeholder: placeholder,
                                rows: 1
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 220,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "btn-primary",
                                onClick: handleSend,
                                disabled: !inputText.trim() && attachments.length === 0,
                                type: "button",
                                style: {
                                    padding: '0.65rem 1.2rem',
                                    height: '42px'
                                },
                                children: "Enviar"
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 229,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 201,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/Chat.tsx",
                lineNumber: 183,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/Chat.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Chat, "Yfl7B90WIDy2mVEt7JaLnLcl8mc=");
_c = Chat;
var _c;
__turbopack_context__.k.register(_c, "Chat");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ModeSwitch.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ModeSwitch",
    ()=>ModeSwitch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/data.ts [app-client] (ecmascript)");
'use client';
;
;
const ModeSwitch = ({ actors, selectedActor, onSelectActor, onConnect, isConnecting, isConnected, sessionRole })=>{
    const activeActors = actors.length > 0 ? actors : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SIMULATED_ACTORS"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
            className: "app-header",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "brand-title",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "🏦 Bankai Dispute Support"
                        }, void 0, false, {
                            fileName: "[project]/components/ModeSwitch.tsx",
                            lineNumber: 32,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "brand-badge",
                            style: {
                                backgroundColor: 'var(--blue-soft)',
                                color: 'var(--blue-primary)',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                            },
                            children: "🟢 BACKEND REAL EN VIVO"
                        }, void 0, false, {
                            fileName: "[project]/components/ModeSwitch.tsx",
                            lineNumber: 33,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ModeSwitch.tsx",
                    lineNumber: 31,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "connection-inputs",
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "actor-select",
                                    style: {
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        color: 'var(--text-ink)'
                                    },
                                    children: "Usuario:"
                                }, void 0, false, {
                                    fileName: "[project]/components/ModeSwitch.tsx",
                                    lineNumber: 40,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    id: "actor-select",
                                    className: "select-actor",
                                    value: selectedActor,
                                    onChange: (e)=>onSelectActor(e.target.value),
                                    style: {
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.82rem',
                                        borderRadius: 'var(--control-radius)',
                                        border: '1px solid var(--line-color)'
                                    },
                                    children: activeActors.map((actor)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: actor.actorId,
                                            children: [
                                                actor.label,
                                                " (",
                                                actor.role,
                                                ")"
                                            ]
                                        }, actor.actorId, true, {
                                            fileName: "[project]/components/ModeSwitch.tsx",
                                            lineNumber: 51,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)))
                                }, void 0, false, {
                                    fileName: "[project]/components/ModeSwitch.tsx",
                                    lineNumber: 43,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "btn-primary",
                                    onClick: onConnect,
                                    disabled: isConnecting,
                                    type: "button",
                                    style: {
                                        padding: '0.3rem 0.75rem',
                                        fontSize: '0.8rem'
                                    },
                                    children: isConnecting ? 'Conectando...' : isConnected ? 'Reconectar' : 'Conectar'
                                }, void 0, false, {
                                    fileName: "[project]/components/ModeSwitch.tsx",
                                    lineNumber: 57,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ModeSwitch.tsx",
                            lineNumber: 39,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `status-badge ${isConnected ? 'connected' : 'disconnected'}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: `status-dot ${isConnected ? 'connected' : 'disconnected'}`
                                }, void 0, false, {
                                    fileName: "[project]/components/ModeSwitch.tsx",
                                    lineNumber: 69,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: isConnected ? `Conectado (${sessionRole || 'OK'})` : 'Desconectado'
                                }, void 0, false, {
                                    fileName: "[project]/components/ModeSwitch.tsx",
                                    lineNumber: 70,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ModeSwitch.tsx",
                            lineNumber: 68,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ModeSwitch.tsx",
                    lineNumber: 38,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/components/ModeSwitch.tsx",
            lineNumber: 30,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/ModeSwitch.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = ModeSwitch;
var _c;
__turbopack_context__.k.register(_c, "ModeSwitch");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/backend.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createDemoSession",
    ()=>createDemoSession,
    "decideEscalation",
    ()=>decideEscalation,
    "getConversationThread",
    ()=>getConversationThread,
    "getConversations",
    ()=>getConversations,
    "getCurrentSession",
    ()=>getCurrentSession,
    "getDemoActors",
    ()=>getDemoActors,
    "getDemoFixtures",
    ()=>getDemoFixtures,
    "getDisputeCase",
    ()=>getDisputeCase,
    "getDisputeEvidence",
    ()=>getDisputeEvidence,
    "getLiveHealth",
    ()=>getLiveHealth,
    "getReadiness",
    ()=>getReadiness,
    "getTransactionEvidence",
    ()=>getTransactionEvidence,
    "requestEscalation",
    ()=>requestEscalation,
    "uploadAttachment",
    ()=>uploadAttachment
]);
const API_BASE = '/backend';
async function handleResponse(res) {
    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/problem+json') || !res.ok) {
        try {
            const problem = await res.json();
            return {
                ok: false,
                problem,
                status
            };
        } catch  {
            return {
                ok: false,
                status,
                problem: {
                    type: 'about:blank',
                    title: res.statusText || 'Error de petición',
                    status,
                    code: `HTTP-${status}`,
                    category: 'INTERNAL',
                    detail_key: 'http_error',
                    behavior: {
                        retryable: 'never',
                        financial_effect: 'none',
                        human_action: 'contact_support',
                        agent_hint: 'ABORT_AND_REPORT',
                        retry_after_s: null
                    },
                    correlation: {
                        trace_id: 'local'
                    },
                    occurred_at: new Date().toISOString()
                }
            };
        }
    }
    try {
        const data = await res.json();
        return {
            ok: true,
            data,
            status
        };
    } catch  {
        return {
            ok: true,
            status
        };
    }
}
let activeSessionId = null;
function authHeaders(extraHeaders = {}) {
    const headers = {
        ...extraHeaders
    };
    if (activeSessionId) {
        headers['Authorization'] = `Bearer ${activeSessionId}`;
    }
    return headers;
}
async function getLiveHealth() {
    const res = await fetch(`${API_BASE}/v1/health/live`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getReadiness() {
    const res = await fetch(`${API_BASE}/v1/health/ready`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDemoActors() {
    const res = await fetch(`${API_BASE}/v1/demo/actors`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDemoFixtures() {
    const res = await fetch(`${API_BASE}/v1/demo/fixtures`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function createDemoSession(actorId) {
    const res = await fetch(`${API_BASE}/v1/demo/sessions`, {
        method: 'POST',
        headers: authHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            actorId
        }),
        credentials: 'include'
    });
    const parsed = await handleResponse(res);
    if (parsed.ok && parsed.data?.sessionId) {
        activeSessionId = parsed.data.sessionId;
    }
    return parsed;
}
async function getCurrentSession() {
    const res = await fetch(`${API_BASE}/v1/me`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getConversations() {
    const res = await fetch(`${API_BASE}/v1/conversations`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getConversationThread(threadId) {
    const res = await fetch(`${API_BASE}/v1/conversations/${encodeURIComponent(threadId)}`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getTransactionEvidence(transactionId) {
    const res = await fetch(`${API_BASE}/v1/transactions/${encodeURIComponent(transactionId)}`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDisputeEvidence(disputeId) {
    const res = await fetch(`${API_BASE}/v1/disputes/${encodeURIComponent(disputeId)}`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDisputeCase(caseId) {
    const res = await fetch(`${API_BASE}/v1/dispute-cases/${encodeURIComponent(caseId)}`, {
        headers: authHeaders(),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function requestEscalation(caseId, reasonCode = 'unrecognized_transaction') {
    const res = await fetch(`${API_BASE}/v1/dispute-cases/${encodeURIComponent(caseId)}/escalations`, {
        method: 'POST',
        headers: authHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            reasonCode
        }),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function decideEscalation(approvalId, decision) {
    const res = await fetch(`${API_BASE}/v1/approvals/${encodeURIComponent(approvalId)}/decisions`, {
        method: 'POST',
        headers: authHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            decision
        }),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function uploadAttachment(file, kind) {
    // Step 1: Create upload authorization
    const initRes = await fetch(`${API_BASE}/v1/uploads`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            kind,
            mediaType: file.type || (kind === 'image' ? 'image/png' : 'audio/mpeg'),
            byteSize: file.size,
            filename: file.name
        }),
        credentials: 'include'
    });
    const initParsed = await handleResponse(initRes);
    if (!initParsed.ok || !initParsed.data) {
        return initParsed;
    }
    const { attachment, uploadUrl } = initParsed.data;
    // Step 2: PUT binary bytes to uploadUrl (or demo endpoint)
    const arrayBuffer = await file.arrayBuffer();
    const putTarget = uploadUrl.startsWith('/v1/') ? `${API_BASE}${uploadUrl}` : uploadUrl;
    const putRes = await fetch(putTarget, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type || (kind === 'image' ? 'image/png' : 'audio/mpeg')
        },
        body: arrayBuffer,
        credentials: 'include'
    });
    const putParsed = await handleResponse(putRes);
    if (!putParsed.ok) {
        return putParsed;
    }
    // Step 3: Complete upload
    const compRes = await fetch(`${API_BASE}/v1/uploads/${encodeURIComponent(attachment.attachmentId)}/complete`, {
        method: 'POST',
        credentials: 'include'
    });
    return handleResponse(compRes);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/data.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MOCK_CONVERSATIONS",
    ()=>MOCK_CONVERSATIONS,
    "MOCK_CUSTOMER_PROFILE",
    ()=>MOCK_CUSTOMER_PROFILE,
    "MOCK_TRACE_STEPS",
    ()=>MOCK_TRACE_STEPS,
    "SIMULATED_ACTORS",
    ()=>SIMULATED_ACTORS
]);
const SIMULATED_ACTORS = [
    {
        actorId: 'demo-customer-1',
        label: 'Cliente Demo (Carlos Mendoza)',
        role: 'customer',
        recommended: true
    },
    {
        actorId: 'demo-backoffice-1',
        label: 'Operador Backoffice (Ana Torres)',
        role: 'backoffice',
        recommended: false
    }
];
const MOCK_CUSTOMER_PROFILE = {
    name: 'Carlos Alberto Mendoza',
    documentId: 'RUT 18.942.301-4',
    email: 'carlos.mendoza@email.demo',
    phone: '+56 9 8765 4321',
    hasRealBackendData: false,
    products: [
        {
            id: 'prod-01',
            name: 'Tarjeta Crédito Signature',
            type: 'Crédito',
            status: 'Activa'
        },
        {
            id: 'prod-02',
            name: 'Cuenta Corriente Preferencial',
            type: 'Débito',
            status: 'Activa'
        }
    ],
    transactions: [
        {
            id: 'demo-transaction-1',
            date: '2026-10-02 14:32',
            merchant: 'COMPRA ONLINE E-COMMERCE',
            amountBucket: 'medium (USD 450.00)',
            currency: 'USD',
            status: 'approved'
        },
        {
            id: 'tx-102',
            date: '2026-10-01 09:15',
            merchant: 'SUPERMERCADO CENTRAL',
            amountBucket: 'low (CLP 35.000)',
            currency: 'CLP',
            status: 'approved'
        }
    ]
};
const MOCK_CONVERSATIONS = [
    {
        threadId: 'sim-thread-01',
        tenantId: 'demo-bankai',
        ownerUserId: 'demo-customer-1',
        revision: 6,
        messages: [
            {
                messageId: 'sim-msg-1',
                role: 'customer',
                content: 'Hola, veo un cobro de 450 USD en mi tarjeta que no reconozco.',
                attachments: [],
                createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
                messageId: 'sim-msg-2',
                role: 'assistant',
                content: 'Hola Carlos, comprendo tu inquietud. He localizado la transacción "COMPRA ONLINE E-COMMERCE" por USD 450.00 realizada el 02 de octubre.',
                attachments: [],
                createdAt: new Date(Date.now() - 3500000).toISOString()
            },
            {
                messageId: 'sim-msg-3',
                role: 'customer',
                content: 'No reconozco esa compra. Quiero iniciar la disputa formal.',
                attachments: [],
                createdAt: new Date(Date.now() - 3000000).toISOString()
            },
            {
                messageId: 'sim-msg-4',
                role: 'assistant',
                content: 'Entendido. Para avanzar con el escalamiento de la disputa se requiere la revisión y autorización de un operador de nuestro equipo de Backoffice.',
                attachments: [],
                createdAt: new Date(Date.now() - 2800000).toISOString()
            }
        ],
        trace: {
            traceId: 'sim-trace-01',
            status: 'pending_approval',
            reasonCode: 'unrecognized_transaction',
            decisionId: 'dec-1001',
            workflowId: 'wf-dispute-escalation',
            approvalId: 'sim-approval-01',
            updatedAt: new Date(Date.now() - 2800000).toISOString()
        }
    },
    {
        threadId: 'sim-thread-02',
        tenantId: 'demo-bankai',
        ownerUserId: 'demo-customer-2',
        revision: 4,
        messages: [
            {
                messageId: 'sim-msg-201',
                role: 'customer',
                content: 'Consulta sobre el límite de mi tarjeta de crédito.',
                attachments: [],
                createdAt: new Date(Date.now() - 7200000).toISOString()
            },
            {
                messageId: 'sim-msg-202',
                role: 'assistant',
                content: 'Tu límite de crédito actual disponible es de USD 5,000.00. ¿Necesitas solicitar un aumento?',
                attachments: [],
                createdAt: new Date(Date.now() - 7100000).toISOString()
            }
        ],
        trace: {
            traceId: 'sim-trace-02',
            status: 'completed',
            reasonCode: null,
            decisionId: null,
            workflowId: 'wf-limit-query',
            approvalId: null,
            updatedAt: new Date(Date.now() - 7100000).toISOString()
        }
    }
];
const MOCK_TRACE_STEPS = {
    'sim-thread-01': [
        {
            id: 'step-3',
            title: 'Escalamiento de Disputa por Cobro No Reconocido (Caso #demo-case-1)',
            timestamp: new Date(Date.now() - 2800000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            }),
            isInvasive: true,
            actorType: 'human_pending',
            approvalId: 'sim-approval-01',
            status: 'pending'
        },
        {
            id: 'step-2',
            title: 'Consulta de Evidencia de Transacción (demo-transaction-1)',
            timestamp: new Date(Date.now() - 3500000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            }),
            isInvasive: false,
            actorType: 'bot'
        },
        {
            id: 'step-1',
            title: 'Análisis de Intención y Clasificación de Reclamo',
            timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            }),
            isInvasive: false,
            actorType: 'bot'
        }
    ],
    'sim-thread-02': [
        {
            id: 'step-201',
            title: 'Consulta de Saldo y Cupo Autorizado',
            timestamp: new Date(Date.now() - 7100000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            }),
            isInvasive: false,
            actorType: 'bot'
        }
    ]
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/realtime.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useRealtime",
    ()=>useRealtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
const WS_URL = ("TURBOPACK compile-time value", "ws://localhost:3000/v1/realtime") || 'ws://localhost:3000/v1/realtime';
function useRealtime(options) {
    _s();
    const [isConnected, setIsConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [eventLogs, setEventLogs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const wsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const addLog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[addLog]": (evt)=>{
            let isWarning = false;
            if (evt.type === 'problem') {
                isWarning = true;
            } else if (evt.type === 'session.ready' && (!evt.payload?.userId || !Array.isArray(evt.payload?.roles))) {
                isWarning = true;
            } else if (evt.type === 'conversation.snapshot' && (!evt.payload?.threadId || !evt.payload?.trace)) {
                isWarning = true;
            }
            const logItem = {
                ...evt,
                timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                isWarning
            };
            setEventLogs({
                "useRealtime.useCallback[addLog]": (prev)=>[
                        logItem,
                        ...prev
                    ]
            }["useRealtime.useCallback[addLog]"]);
        }
    }["useRealtime.useCallback[addLog]"], []);
    const connect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[connect]": ()=>{
            if (!options.enabled) return;
            if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                return;
            }
            try {
                const ws = new WebSocket(WS_URL);
                wsRef.current = ws;
                ws.onopen = ({
                    "useRealtime.useCallback[connect]": ()=>{
                        setIsConnected(true);
                    }
                })["useRealtime.useCallback[connect]"];
                ws.onmessage = ({
                    "useRealtime.useCallback[connect]": (event)=>{
                        try {
                            const parsed = JSON.parse(event.data);
                            addLog(parsed);
                            if (options.onEvent) options.onEvent(parsed);
                            switch(parsed.type){
                                case 'conversation.snapshot':
                                    if (options.onSnapshot && parsed.payload) {
                                        options.onSnapshot(parsed.payload);
                                    }
                                    break;
                                case 'run.state':
                                    if (options.onStateChange && parsed.payload?.status) {
                                        options.onStateChange({
                                            status: parsed.payload.status,
                                            threadId: parsed.threadId
                                        });
                                    }
                                    break;
                                case 'assistant.delta':
                                    if (options.onDelta && parsed.payload?.value) {
                                        options.onDelta({
                                            threadId: parsed.threadId,
                                            value: parsed.payload.value,
                                            messageId: parsed.payload.messageId
                                        });
                                    }
                                    break;
                                case 'assistant.completed':
                                    if (options.onCompleted && parsed.payload?.response) {
                                        options.onCompleted({
                                            threadId: parsed.threadId,
                                            response: parsed.payload.response,
                                            status: parsed.payload.status
                                        });
                                    }
                                    break;
                                case 'backoffice.alert':
                                    if (options.onAlert && parsed.payload?.approvalId) {
                                        options.onAlert({
                                            approvalId: parsed.payload.approvalId,
                                            threadId: parsed.threadId
                                        });
                                    }
                                    break;
                                case 'problem':
                                    if (options.onProblem && parsed.payload?.code) {
                                        options.onProblem({
                                            code: parsed.payload.code,
                                            threadId: parsed.threadId
                                        });
                                    }
                                    break;
                            }
                        } catch (e) {
                            console.error('Error parsing WS message:', e);
                        }
                    }
                })["useRealtime.useCallback[connect]"];
                ws.onclose = ({
                    "useRealtime.useCallback[connect]": ()=>{
                        setIsConnected(false);
                    }
                })["useRealtime.useCallback[connect]"];
                ws.onerror = ({
                    "useRealtime.useCallback[connect]": (err)=>{
                        setIsConnected(false);
                    }
                })["useRealtime.useCallback[connect]"];
            } catch (e) {
                console.warn('WS connection attempt pending session cookie initialization');
            }
        }
    }["useRealtime.useCallback[connect]"], [
        options,
        addLog
    ]);
    const disconnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[disconnect]": ()=>{
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsConnected(false);
        }
    }["useRealtime.useCallback[disconnect]"], []);
    const sendChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[sendChat]": (data)=>{
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.warn('Cannot send WS message: Socket not open');
                return false;
            }
            const payload = {
                type: 'chat.send',
                clientMessageId: data.clientMessageId,
                ...data.threadId ? {
                    threadId: data.threadId
                } : {},
                ...data.text ? {
                    text: data.text
                } : {},
                attachmentIds: data.attachmentIds || []
            };
            wsRef.current.send(JSON.stringify(payload));
            addLog({
                type: 'chat.send',
                threadId: data.threadId || null,
                traceId: null,
                revision: null,
                payload
            });
            return true;
        }
    }["useRealtime.useCallback[sendChat]"], [
        addLog
    ]);
    const subscribeThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[subscribeThread]": (threadId)=>{
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            const payload = {
                type: 'conversation.subscribe',
                threadId
            };
            wsRef.current.send(JSON.stringify(payload));
            addLog({
                type: 'conversation.subscribe',
                threadId,
                traceId: null,
                revision: null,
                payload
            });
        }
    }["useRealtime.useCallback[subscribeThread]"], [
        addLog
    ]);
    const clearLogs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useRealtime.useCallback[clearLogs]": ()=>{
            setEventLogs([]);
        }
    }["useRealtime.useCallback[clearLogs]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRealtime.useEffect": ()=>{
            if (!options.enabled) {
                disconnect();
            }
            return ({
                "useRealtime.useEffect": ()=>{
                    disconnect();
                }
            })["useRealtime.useEffect"];
        }
    }["useRealtime.useEffect"], [
        options.enabled,
        disconnect
    ]);
    return {
        isConnected,
        eventLogs,
        connect,
        disconnect,
        sendChat,
        subscribeThread,
        clearLogs
    };
}
_s(useRealtime, "XfO05rKnmVtDMqifNGcEjfef2Rg=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
]);

//# sourceMappingURL=_0wqvk5s._.js.map