(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/chat/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ModeSwitch$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ModeSwitch.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Chat.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$EventLogDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/EventLogDrawer.tsx [app-client] (ecmascript)");
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
;
;
function ChatPage() {
    _s();
    const [isRealMode, setIsRealMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [actors, setActors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedActor, setSelectedActor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('demo-customer-1');
    const [isConnecting, setIsConnecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sessionRole, setSessionRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isDrawerOpen, setIsDrawerOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [currentThreadId, setCurrentThreadId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isTyping, setIsTyping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [systemAlert, setSystemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [problemAlert, setProblemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Streaming accumulation buffer
    const streamingMsgIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const streamingTextRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])('');
    // Synchronize isRealMode with localStorage (defaulting to real mode)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            const saved = localStorage.getItem('bankai_is_real_mode');
            if (saved === 'false') {
                setIsRealMode(false);
            } else {
                setIsRealMode(true);
                localStorage.setItem('bankai_is_real_mode', 'true');
            }
        }
    }["ChatPage.useEffect"], []);
    const handleToggleMode = (val)=>{
        setIsRealMode(val);
        localStorage.setItem('bankai_is_real_mode', val ? 'true' : 'false');
    };
    const onSnapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChatPage.useCallback[onSnapshot]": (snapshot)=>{
            if (snapshot?.threadId) {
                setCurrentThreadId(snapshot.threadId);
            }
            if (Array.isArray(snapshot?.messages)) {
                setMessages(snapshot.messages);
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
        enabled: isRealMode,
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
            if (isRealMode) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDemoActors"])().then({
                    "ChatPage.useEffect": (res)=>{
                        if (res.ok && res.data) setActors(res.data);
                    }
                }["ChatPage.useEffect"]);
                if (!realtime.isConnected && !isConnecting) {
                    handleConnect('demo-customer-1');
                }
            }
        }
    }["ChatPage.useEffect"], [
        isRealMode,
        handleConnect,
        realtime.isConnected,
        isConnecting
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
        if (isRealMode) {
            setIsTyping(true);
            realtime.sendChat({
                clientMessageId: userMessage.messageId,
                text,
                threadId: currentThreadId || undefined,
                attachmentIds
            });
        } else {
            // Simulated response
            setIsTyping(true);
            setTimeout(()=>{
                setIsTyping(false);
                let simResponse = 'Entendido. He registrado tu consulta en el sistema de demostración.';
                if (text.toLowerCase().includes('450') || text.toLowerCase().includes('disputa') || text.toLowerCase().includes('no reconoc')) {
                    simResponse = 'He identificado la transacción "COMPRA ONLINE E-COMMERCE" de 450 USD. Para realizar el escalamiento formal de esta disputa se requiere la aprobación de un operador.';
                    setSystemAlert('Acción invasiva detectada: Requiere aprobación del equipo de Backoffice.');
                }
                setMessages((prev)=>[
                        ...prev,
                        {
                            messageId: `sim-resp-${Date.now()}`,
                            role: 'assistant',
                            content: simResponse,
                            attachments: [],
                            createdAt: new Date().toISOString()
                        }
                    ]);
            }, 1200);
        }
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
                isRealMode: isRealMode,
                onToggleMode: handleToggleMode,
                actors: actors,
                selectedActor: selectedActor,
                onSelectActor: (id)=>{
                    setSelectedActor(id);
                    handleConnect(id);
                },
                onConnect: ()=>handleConnect(),
                isConnecting: isConnecting,
                isConnected: realtime.isConnected,
                sessionRole: sessionRole,
                onToggleEventLog: ()=>setIsDrawerOpen(!isDrawerOpen),
                eventCount: realtime.eventLogs.length,
                hasWarnings: realtime.eventLogs.some((l)=>l.isWarning)
            }, void 0, false, {
                fileName: "[project]/app/chat/page.tsx",
                lineNumber: 216,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.6rem 1.5rem',
                    backgroundColor: 'var(--surface-color)',
                    borderBottom: '1px solid var(--line-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: 'var(--text-ink)'
                        },
                        children: "💬 Ambiente 1 — Chat Conversacional"
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.tsx",
                        lineNumber: 235,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "btn-secondary",
                        style: {
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.8rem'
                        },
                        children: "← Volver al Inicio"
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.tsx",
                        lineNumber: 238,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/chat/page.tsx",
                lineNumber: 234,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                style: {
                    flex: 1,
                    padding: '1.25rem',
                    maxWidth: '900px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "panel-card",
                    style: {
                        flex: 1
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Chat"], {
                        messages: messages,
                        onSendMessage: handleSendMessage,
                        isTyping: isTyping,
                        systemAlert: systemAlert,
                        problemAlert: problemAlert,
                        isRealMode: isRealMode
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.tsx",
                        lineNumber: 245,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/chat/page.tsx",
                    lineNumber: 244,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/chat/page.tsx",
                lineNumber: 243,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$EventLogDrawer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EventLogDrawer"], {
                isOpen: isDrawerOpen,
                onClose: ()=>setIsDrawerOpen(false),
                logs: realtime.eventLogs,
                onClear: realtime.clearLogs
            }, void 0, false, {
                fileName: "[project]/app/chat/page.tsx",
                lineNumber: 256,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/chat/page.tsx",
        lineNumber: 215,
        columnNumber: 5
    }, this);
}
_s(ChatPage, "QrnW2GgztfQPdbJg++8Sf7D0dLs=", false, function() {
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
const Chat = ({ messages, onSendMessage, isTyping = false, systemAlert = null, problemAlert = null, placeholder = 'Escribe tu mensaje aquí... (Enter para enviar, Shift+Enter para nueva línea)', isRealMode = false })=>{
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
        if (isRealMode) {
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
        } else {
            // Simulated upload
            setTimeout(()=>{
                const kind = file.type.startsWith('audio') ? 'audio' : 'image';
                setAttachments((prev)=>[
                        ...prev,
                        {
                            attachmentId: `sim-att-${Date.now()}`,
                            kind,
                            mediaType: file.type || 'image/png',
                            status: 'ready'
                        }
                    ]);
            }, 500);
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const removeAttachment = (id)=>{
        setAttachments((prev)=>prev.filter((a)=>a.attachmentId !== id));
    };
    const suggestions = [
        'Quiero revisar una compra no reconocida de 450 USD',
        '¿Cuál es el estado de mi solicitud de disputa?',
        'Necesito ayuda con el bloqueo preventivo de mi tarjeta'
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
                            padding: '2rem 1rem',
                            textAlign: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                style: {
                                    fontSize: '1.1rem',
                                    color: 'var(--text-ink)',
                                    marginBottom: '0.5rem'
                                },
                                children: "👋 Asistente Virtual de Soporte para Disputas"
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 118,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: '0.88rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '1.5rem'
                                },
                                children: "Escribe tu consulta o selecciona una sugerencia para iniciar la atención:"
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 121,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    maxWidth: '400px',
                                    margin: '0 auto'
                                },
                                children: suggestions.map((suggestion, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>onSendMessage(suggestion),
                                        type: "button",
                                        style: {
                                            backgroundColor: 'var(--blue-soft)',
                                            color: 'var(--blue-primary)',
                                            border: '1px solid #BFD2FB',
                                            borderRadius: '8px',
                                            padding: '0.6rem 0.9rem',
                                            fontSize: '0.85rem',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        },
                                        children: [
                                            "💡 ",
                                            suggestion
                                        ]
                                    }, idx, true, {
                                        fileName: "[project]/components/Chat.tsx",
                                        lineNumber: 126,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 124,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 117,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    messages.map((msg, idx)=>{
                        const isUser = msg.role === 'customer';
                        const isBackoffice = msg.role === 'backoffice';
                        const isAssistant = msg.role === 'assistant';
                        let bubbleClass = 'assistant';
                        if (isUser) bubbleClass = 'customer';
                        if (isBackoffice) bubbleClass = 'backoffice';
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `chat-bubble ${bubbleClass}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.72rem',
                                        opacity: 0.8,
                                        marginBottom: '0.2rem',
                                        fontWeight: 600
                                    },
                                    children: isUser ? 'Cliente' : isBackoffice ? 'Operador (Backoffice)' : 'Asistente AI'
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 160,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: msg.content
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 164,
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
                                            lineNumber: 169,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)))
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 167,
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
                                    lineNumber: 184,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, msg.messageId ? `${msg.messageId}-${idx}` : `msg-${idx}`, true, {
                            fileName: "[project]/components/Chat.tsx",
                            lineNumber: 159,
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
                                lineNumber: 193,
                                columnNumber: 16
                            }, ("TURBOPACK compile-time value", void 0)),
                            " ",
                            systemAlert
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 192,
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
                                lineNumber: 199,
                                columnNumber: 16
                            }, ("TURBOPACK compile-time value", void 0)),
                            " ",
                            problemAlert
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 198,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    isTyping && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "typing-indicator",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "El asistente está escribiendo..."
                        }, void 0, false, {
                            fileName: "[project]/components/Chat.tsx",
                            lineNumber: 205,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 204,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        ref: messagesEndRef
                    }, void 0, false, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 209,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/Chat.tsx",
                lineNumber: 115,
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
                                        lineNumber: 217,
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
                                        lineNumber: 218,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, att.attachmentId, true, {
                                fileName: "[project]/components/Chat.tsx",
                                lineNumber: 216,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)))
                    }, void 0, false, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 214,
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
                                lineNumber: 231,
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
                                lineNumber: 238,
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
                                lineNumber: 249,
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
                                lineNumber: 258,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Chat.tsx",
                        lineNumber: 230,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/Chat.tsx",
                lineNumber: 212,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/Chat.tsx",
        lineNumber: 114,
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
"[project]/components/EventLogDrawer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EventLogDrawer",
    ()=>EventLogDrawer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
const EventLogDrawer = ({ isOpen, onClose, logs, onClear })=>{
    _s();
    const [copied, setCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    if (!isOpen) return null;
    const copyAll = ()=>{
        navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
        setCopied(true);
        setTimeout(()=>setCopied(false), 2000);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            position: 'fixed',
            bottom: 0,
            right: 0,
            width: '450px',
            maxHeight: '500px',
            backgroundColor: '#0E1A2B',
            color: '#F1F4F9',
            borderTopLeftRadius: '10px',
            boxShadow: '-4px -4px 20px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace'
        },
        role: "region",
        "aria-label": "Registro de eventos en tiempo real",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #23344E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        },
                        children: [
                            "📡 Registro de Eventos (",
                            logs.length,
                            ")"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/EventLogDrawer.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '0.5rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: copyAll,
                                style: {
                                    backgroundColor: '#1E2D42',
                                    color: '#FFF',
                                    border: '1px solid #3A4B63',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                },
                                children: copied ? '¡Copiado!' : 'Copiar todo (JSON)'
                            }, void 0, false, {
                                fileName: "[project]/components/EventLogDrawer.tsx",
                                lineNumber: 62,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClear,
                                style: {
                                    backgroundColor: '#1E2D42',
                                    color: '#FFF',
                                    border: '1px solid #3A4B63',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                },
                                children: "Limpiar"
                            }, void 0, false, {
                                fileName: "[project]/components/EventLogDrawer.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClose,
                                style: {
                                    backgroundColor: 'transparent',
                                    color: '#FFF',
                                    border: 'none',
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                },
                                children: "✕"
                            }, void 0, false, {
                                fileName: "[project]/components/EventLogDrawer.tsx",
                                lineNumber: 90,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/EventLogDrawer.tsx",
                        lineNumber: 61,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/EventLogDrawer.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.8rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: '0.78rem'
                },
                children: logs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        color: '#647286',
                        textAlign: 'center',
                        padding: '1rem'
                    },
                    children: "No hay eventos registrados aún."
                }, void 0, false, {
                    fileName: "[project]/components/EventLogDrawer.tsx",
                    lineNumber: 117,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)) : logs.map((log, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            backgroundColor: log.isWarning ? '#3D1518' : '#17253B',
                            border: log.isWarning ? '1px solid #D42F3C' : '1px solid #23344E',
                            borderRadius: '6px',
                            padding: '0.6rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.3rem',
                                    color: log.isWarning ? '#FCE7E9' : '#8CA3CB',
                                    fontWeight: 'bold'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            log.isWarning && '⚠️ ',
                                            log.type
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/EventLogDrawer.tsx",
                                        lineNumber: 140,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontSize: '0.7rem',
                                            color: '#647286'
                                        },
                                        children: log.timestamp
                                    }, void 0, false, {
                                        fileName: "[project]/components/EventLogDrawer.tsx",
                                        lineNumber: 144,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/EventLogDrawer.tsx",
                                lineNumber: 131,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                style: {
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    color: '#D6DDE8'
                                },
                                children: JSON.stringify(log.payload, null, 2)
                            }, void 0, false, {
                                fileName: "[project]/components/EventLogDrawer.tsx",
                                lineNumber: 146,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, index, true, {
                        fileName: "[project]/components/EventLogDrawer.tsx",
                        lineNumber: 122,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)))
            }, void 0, false, {
                fileName: "[project]/components/EventLogDrawer.tsx",
                lineNumber: 105,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/EventLogDrawer.tsx",
        lineNumber: 30,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(EventLogDrawer, "NE86rL3vg4NVcTTWDavsT0hUBJs=");
_c = EventLogDrawer;
var _c;
__turbopack_context__.k.register(_c, "EventLogDrawer");
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
async function getLiveHealth() {
    const res = await fetch(`${API_BASE}/v1/health/live`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getReadiness() {
    const res = await fetch(`${API_BASE}/v1/health/ready`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDemoActors() {
    const res = await fetch(`${API_BASE}/v1/demo/actors`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDemoFixtures() {
    const res = await fetch(`${API_BASE}/v1/demo/fixtures`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function createDemoSession(actorId) {
    const res = await fetch(`${API_BASE}/v1/demo/sessions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            actorId
        }),
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getCurrentSession() {
    const res = await fetch(`${API_BASE}/v1/me`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getConversations() {
    const res = await fetch(`${API_BASE}/v1/conversations`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getConversationThread(threadId) {
    const res = await fetch(`${API_BASE}/v1/conversations/${encodeURIComponent(threadId)}`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getTransactionEvidence(transactionId) {
    const res = await fetch(`${API_BASE}/v1/transactions/${encodeURIComponent(transactionId)}`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDisputeEvidence(disputeId) {
    const res = await fetch(`${API_BASE}/v1/disputes/${encodeURIComponent(disputeId)}`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function getDisputeCase(caseId) {
    const res = await fetch(`${API_BASE}/v1/dispute-cases/${encodeURIComponent(caseId)}`, {
        credentials: 'include'
    });
    return handleResponse(res);
}
async function requestEscalation(caseId, reasonCode = 'unrecognized_transaction') {
    const res = await fetch(`${API_BASE}/v1/dispute-cases/${encodeURIComponent(caseId)}/escalations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
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
        headers: {
            'Content-Type': 'application/json'
        },
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
"[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    default: null,
    useLinkStatus: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    /**
 * A React component that extends the HTML `<a>` element to provide
 * [prefetching](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#2-prefetching)
 * and client-side navigation. This is the primary way to navigate between routes in Next.js.
 *
 * @remarks
 * - Prefetching is only enabled in production.
 *
 * @see https://nextjs.org/docs/app/api-reference/components/link
 */ default: function() {
        return LinkComponent;
    },
    useLinkStatus: function() {
        return useLinkStatus;
    }
});
const _interop_require_wildcard = __turbopack_context__.r("[project]/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _jsxruntime = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const _formaturl = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/router/utils/format-url.js [app-client] (ecmascript)");
const _approutercontextsharedruntime = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js [app-client] (ecmascript)");
const _usemergedref = __turbopack_context__.r("[project]/node_modules/next/dist/client/use-merged-ref.js [app-client] (ecmascript)");
const _utils = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)");
const _addbasepath = __turbopack_context__.r("[project]/node_modules/next/dist/client/add-base-path.js [app-client] (ecmascript)");
const _routerreducertypes = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/router-reducer/router-reducer-types.js [app-client] (ecmascript)");
const _links = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/links.js [app-client] (ecmascript)");
const _islocalurl = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/router/utils/is-local-url.js [app-client] (ecmascript)");
const _types = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/segment-cache/types.js [app-client] (ecmascript)");
function isModifiedEvent(event) {
    const eventTarget = event.currentTarget;
    const target = eventTarget.getAttribute('target');
    return target && target !== '_self' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || // triggers resource download
    event.nativeEvent && event.nativeEvent.which === 2;
}
function linkClicked(e, href, linkInstanceRef, replace, scroll, onNavigate, transitionTypes, prefetchIntent = 'none') {
    if (typeof window !== 'undefined') {
        const { nodeName } = e.currentTarget;
        // anchors inside an svg have a lowercase nodeName
        const isAnchorNodeName = nodeName.toUpperCase() === 'A';
        if (isAnchorNodeName && isModifiedEvent(e) || e.currentTarget.hasAttribute('download')) {
            // ignore click for browser’s default behavior
            return;
        }
        if (!(0, _islocalurl.isLocalURL)(href)) {
            if (replace) {
                // browser default behavior does not replace the history state
                // so we need to do it manually
                e.preventDefault();
                location.replace(href);
            }
            // ignore click for browser’s default behavior
            return;
        }
        e.preventDefault();
        if (onNavigate) {
            let isDefaultPrevented = false;
            onNavigate({
                preventDefault: ()=>{
                    isDefaultPrevented = true;
                }
            });
            if (isDefaultPrevented) {
                return;
            }
        }
        const { dispatchNavigateAction } = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/app-router-instance.js [app-client] (ecmascript)");
        _react.default.startTransition(()=>{
            dispatchNavigateAction(href, replace ? 'replace' : 'push', scroll === false ? _routerreducertypes.ScrollBehavior.NoScroll : _routerreducertypes.ScrollBehavior.Default, linkInstanceRef.current, transitionTypes, prefetchIntent);
        });
    }
}
function formatStringOrUrl(urlObjOrString) {
    if (typeof urlObjOrString === 'string') {
        return urlObjOrString;
    }
    return (0, _formaturl.formatUrl)(urlObjOrString);
}
function LinkComponent(props) {
    const [linkStatus, setOptimisticLinkStatus] = (0, _react.useOptimistic)(_links.IDLE_LINK_STATUS);
    let children;
    const linkInstanceRef = (0, _react.useRef)(null);
    const { href: hrefProp, as: asProp, children: childrenProp, prefetch: prefetchProp = null, passHref, replace, shallow, scroll, onClick, onMouseEnter: onMouseEnterProp, onTouchStart: onTouchStartProp, legacyBehavior = false, onNavigate, transitionTypes, ref: forwardedRef, unstable_dynamicOnHover, ...restProps } = props;
    children = childrenProp;
    if (legacyBehavior && (typeof children === 'string' || typeof children === 'number')) {
        children = /*#__PURE__*/ (0, _jsxruntime.jsx)("a", {
            children: children
        });
    }
    const router = _react.default.useContext(_approutercontextsharedruntime.AppRouterContext);
    const prefetchEnabled = prefetchProp !== false;
    const prefetchIntent = prefetchProp === false ? 'none' : prefetchProp === true ? 'full' : 'auto';
    const fetchStrategy = prefetchIntent !== 'none' ? getFetchStrategyFromPrefetchIntent(prefetchIntent) : _types.FetchStrategy.PPR;
    if ("TURBOPACK compile-time truthy", 1) {
        function createPropError(args) {
            return Object.defineProperty(new Error(`Failed prop type: The prop \`${args.key}\` expects a ${args.expected} in \`<Link>\`, but got \`${args.actual}\` instead.` + (typeof window !== 'undefined' ? "\nOpen your browser's console to view the Component stack trace." : '')), "__NEXT_ERROR_CODE", {
                value: "E319",
                enumerable: false,
                configurable: true
            });
        }
        // TypeScript trick for type-guarding:
        const requiredPropsGuard = {
            href: true
        };
        const requiredProps = Object.keys(requiredPropsGuard);
        requiredProps.forEach((key)=>{
            if (key === 'href') {
                if (props[key] == null || typeof props[key] !== 'string' && typeof props[key] !== 'object') {
                    throw createPropError({
                        key,
                        expected: '`string` or `object`',
                        actual: props[key] === null ? 'null' : typeof props[key]
                    });
                }
            } else {
                // TypeScript trick for type-guarding:
                const _ = key;
            }
        });
        // TypeScript trick for type-guarding:
        const optionalPropsGuard = {
            as: true,
            replace: true,
            scroll: true,
            shallow: true,
            passHref: true,
            prefetch: true,
            unstable_dynamicOnHover: true,
            onClick: true,
            onMouseEnter: true,
            onTouchStart: true,
            legacyBehavior: true,
            onNavigate: true,
            transitionTypes: true
        };
        const optionalProps = Object.keys(optionalPropsGuard);
        optionalProps.forEach((key)=>{
            const valType = typeof props[key];
            if (key === 'as') {
                if (props[key] && valType !== 'string' && valType !== 'object') {
                    throw createPropError({
                        key,
                        expected: '`string` or `object`',
                        actual: valType
                    });
                }
            } else if (key === 'onClick' || key === 'onMouseEnter' || key === 'onTouchStart' || key === 'onNavigate') {
                if (props[key] && valType !== 'function') {
                    throw createPropError({
                        key,
                        expected: '`function`',
                        actual: valType
                    });
                }
            } else if (key === 'replace' || key === 'scroll' || key === 'shallow' || key === 'passHref' || key === 'legacyBehavior' || key === 'unstable_dynamicOnHover') {
                if (props[key] != null && valType !== 'boolean') {
                    throw createPropError({
                        key,
                        expected: '`boolean`',
                        actual: valType
                    });
                }
            } else if (key === 'prefetch') {
                if (props[key] != null && valType !== 'boolean' && props[key] !== 'auto') {
                    throw createPropError({
                        key,
                        expected: '`boolean | "auto"`',
                        actual: valType
                    });
                }
            } else if (key === 'transitionTypes') {
                if (props[key] != null && !Array.isArray(props[key])) {
                    throw createPropError({
                        key,
                        expected: '`string[]`',
                        actual: valType
                    });
                }
            } else {
                // TypeScript trick for type-guarding:
                const _ = key;
            }
        });
    }
    const resolvedHref = asProp || hrefProp;
    const formattedHref = formatStringOrUrl(resolvedHref);
    if ("TURBOPACK compile-time truthy", 1) {
        const { warnOnce } = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils/warn-once.js [app-client] (ecmascript)");
        if (props.locale) {
            warnOnce('The `locale` prop is not supported in `next/link` while using the `app` router. Read more about app router internalization: https://nextjs.org/docs/app/building-your-application/routing/internationalization');
        }
        if (!asProp) {
            let href;
            if (typeof resolvedHref === 'string') {
                href = resolvedHref;
            } else if (typeof resolvedHref === 'object' && typeof resolvedHref.pathname === 'string') {
                href = resolvedHref.pathname;
            }
            if (href) {
                const hasDynamicSegment = href.split('/').some((segment)=>segment.startsWith('[') && segment.endsWith(']'));
                if (hasDynamicSegment) {
                    throw Object.defineProperty(new Error(`Dynamic href \`${href}\` found in <Link> while using the \`/app\` router, this is not supported. Read more: https://nextjs.org/docs/messages/app-dir-dynamic-href`), "__NEXT_ERROR_CODE", {
                        value: "E267",
                        enumerable: false,
                        configurable: true
                    });
                }
            }
        }
    }
    // This will return the first child, if multiple are provided it will throw an error
    let child;
    if (legacyBehavior) {
        if (children?.$$typeof === Symbol.for('react.lazy')) {
            throw Object.defineProperty(new Error(`\`<Link legacyBehavior>\` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's \`<a>\` tag.`), "__NEXT_ERROR_CODE", {
                value: "E863",
                enumerable: false,
                configurable: true
            });
        }
        if ("TURBOPACK compile-time truthy", 1) {
            if (onClick) {
                console.warn(`"onClick" was passed to <Link> with \`href\` of \`${formattedHref}\` but "legacyBehavior" was set. The legacy behavior requires onClick be set on the child of next/link`);
            }
            if (onMouseEnterProp) {
                console.warn(`"onMouseEnter" was passed to <Link> with \`href\` of \`${formattedHref}\` but "legacyBehavior" was set. The legacy behavior requires onMouseEnter be set on the child of next/link`);
            }
            try {
                child = _react.default.Children.only(children);
            } catch (err) {
                if (!children) {
                    throw Object.defineProperty(new Error(`No children were passed to <Link> with \`href\` of \`${formattedHref}\` but one child is required https://nextjs.org/docs/messages/link-no-children`), "__NEXT_ERROR_CODE", {
                        value: "E320",
                        enumerable: false,
                        configurable: true
                    });
                }
                throw Object.defineProperty(new Error(`Multiple children were passed to <Link> with \`href\` of \`${formattedHref}\` but only one child is supported https://nextjs.org/docs/messages/link-multiple-children` + (typeof window !== 'undefined' ? " \nOpen your browser's console to view the Component stack trace." : '')), "__NEXT_ERROR_CODE", {
                    value: "E266",
                    enumerable: false,
                    configurable: true
                });
            }
        } else //TURBOPACK unreachable
        ;
    } else {
        if ("TURBOPACK compile-time truthy", 1) {
            if (children?.type === 'a') {
                throw Object.defineProperty(new Error('Invalid <Link> with <a> child. Please remove <a> or use <Link legacyBehavior>.\nLearn more: https://nextjs.org/docs/messages/invalid-new-link-with-extra-anchor'), "__NEXT_ERROR_CODE", {
                    value: "E209",
                    enumerable: false,
                    configurable: true
                });
            }
        }
    }
    const childRef = legacyBehavior ? child && typeof child === 'object' && child.ref : forwardedRef;
    // Capture the Owner Stack during render so dev-only warnings emitted later
    // at navigation time can be associated with the JSX that created
    // this <Link>.
    const ownerStack = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : undefined;
    // Use a callback ref to attach an IntersectionObserver to the anchor tag on
    // mount. In the future we will also use this to keep track of all the
    // currently mounted <Link> instances, e.g. so we can re-prefetch them after
    // a revalidation or refresh.
    const observeLinkVisibilityOnMount = _react.default.useCallback({
        "LinkComponent.useCallback[observeLinkVisibilityOnMount]": (element)=>{
            if (router !== null) {
                linkInstanceRef.current = (0, _links.mountLinkInstance)(element, formattedHref, router, fetchStrategy, prefetchEnabled, setOptimisticLinkStatus, ownerStack);
            }
            return ({
                "LinkComponent.useCallback[observeLinkVisibilityOnMount]": ()=>{
                    if (linkInstanceRef.current) {
                        (0, _links.unmountLinkForCurrentNavigation)(linkInstanceRef.current);
                        linkInstanceRef.current = null;
                    }
                    (0, _links.unmountPrefetchableInstance)(element);
                }
            })["LinkComponent.useCallback[observeLinkVisibilityOnMount]"];
        }
    }["LinkComponent.useCallback[observeLinkVisibilityOnMount]"], [
        prefetchEnabled,
        formattedHref,
        router,
        fetchStrategy,
        setOptimisticLinkStatus,
        ownerStack
    ]);
    const mergedRef = (0, _usemergedref.useMergedRef)(observeLinkVisibilityOnMount, childRef);
    const childProps = {
        ref: mergedRef,
        onClick (e) {
            if ("TURBOPACK compile-time truthy", 1) {
                if (!e) {
                    throw Object.defineProperty(new Error(`Component rendered inside next/link has to pass click event to "onClick" prop.`), "__NEXT_ERROR_CODE", {
                        value: "E312",
                        enumerable: false,
                        configurable: true
                    });
                }
            }
            if (!legacyBehavior && typeof onClick === 'function') {
                onClick(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onClick === 'function') {
                child.props.onClick(e);
            }
            if (!router) {
                return;
            }
            if (e.defaultPrevented) {
                return;
            }
            linkClicked(e, formattedHref, linkInstanceRef, replace, scroll, onNavigate, transitionTypes, prefetchIntent);
        },
        onMouseEnter (e) {
            if (!legacyBehavior && typeof onMouseEnterProp === 'function') {
                onMouseEnterProp(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onMouseEnter === 'function') {
                child.props.onMouseEnter(e);
            }
            if (!router) {
                return;
            }
            if ("TURBOPACK compile-time truthy", 1) {
                return;
            }
            //TURBOPACK unreachable
            ;
            const upgradeToDynamicPrefetch = undefined;
        },
        onTouchStart: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : function onTouchStart(e) {
            if (!legacyBehavior && typeof onTouchStartProp === 'function') {
                onTouchStartProp(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onTouchStart === 'function') {
                child.props.onTouchStart(e);
            }
            if (!router) {
                return;
            }
            if (!prefetchEnabled) {
                return;
            }
            const upgradeToDynamicPrefetch = unstable_dynamicOnHover === true;
            (0, _links.onNavigationIntent)(e.currentTarget, upgradeToDynamicPrefetch);
        }
    };
    // If the url is absolute, we can bypass the logic to prepend the basePath.
    if ((0, _utils.isAbsoluteUrl)(formattedHref)) {
        childProps.href = formattedHref;
    } else if (!legacyBehavior || passHref || child.type === 'a' && !('href' in child.props)) {
        childProps.href = (0, _addbasepath.addBasePath)(formattedHref);
    }
    let link;
    if (legacyBehavior) {
        if ("TURBOPACK compile-time truthy", 1) {
            const { errorOnce } = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils/error-once.js [app-client] (ecmascript)");
            errorOnce('`legacyBehavior` is deprecated and will be removed in a future ' + 'release. A codemod is available to upgrade your components:\n\n' + 'npx @next/codemod@latest new-link .\n\n' + 'Learn more: https://nextjs.org/docs/app/building-your-application/upgrading/codemods#remove-a-tags-from-link-components');
        }
        link = /*#__PURE__*/ _react.default.cloneElement(child, childProps);
    } else {
        link = /*#__PURE__*/ (0, _jsxruntime.jsx)("a", {
            ...restProps,
            ...childProps,
            children: children
        });
    }
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(LinkStatusContext.Provider, {
        value: linkStatus,
        children: link
    });
}
const LinkStatusContext = /*#__PURE__*/ (0, _react.createContext)(_links.IDLE_LINK_STATUS);
const useLinkStatus = ()=>{
    return (0, _react.useContext)(LinkStatusContext);
};
function getFetchStrategyFromPrefetchIntent(prefetchIntent) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        return prefetchIntent === 'auto' ? _types.FetchStrategy.PPR : _types.FetchStrategy.Full;
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/node_modules/next/dist/client/use-merged-ref.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useMergedRef", {
    enumerable: true,
    get: function() {
        return useMergedRef;
    }
});
const _react = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
function useMergedRef(refA, refB) {
    const cleanupA = (0, _react.useRef)(null);
    const cleanupB = (0, _react.useRef)(null);
    // NOTE: In theory, we could skip the wrapping if only one of the refs is non-null.
    // (this happens often if the user doesn't pass a ref to Link/Form/Image)
    // But this can cause us to leak a cleanup-ref into user code (previously via `<Link legacyBehavior>`),
    // and the user might pass that ref into ref-merging library that doesn't support cleanup refs
    // (because it hasn't been updated for React 19)
    // which can then cause things to blow up, because a cleanup-returning ref gets called with `null`.
    // So in practice, it's safer to be defensive and always wrap the ref, even on React 19.
    return (0, _react.useCallback)((current)=>{
        if (current === null) {
            const cleanupFnA = cleanupA.current;
            if (cleanupFnA) {
                cleanupA.current = null;
                cleanupFnA();
            }
            const cleanupFnB = cleanupB.current;
            if (cleanupFnB) {
                cleanupB.current = null;
                cleanupFnB();
            }
        } else {
            if (refA) {
                cleanupA.current = applyRef(refA, current);
            }
            if (refB) {
                cleanupB.current = applyRef(refB, current);
            }
        }
    }, [
        refA,
        refB
    ]);
}
function applyRef(refA, current) {
    if (typeof refA === 'function') {
        const cleanup = refA(current);
        if (typeof cleanup === 'function') {
            return cleanup;
        } else {
            return ()=>refA(null);
        }
    } else {
        refA.current = current;
        return ()=>{
            refA.current = null;
        };
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
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
"[project]/node_modules/next/dist/shared/lib/router/utils/format-url.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// Format function modified from nodejs
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    formatUrl: null,
    formatWithValidation: null,
    urlObjectKeys: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    formatUrl: function() {
        return formatUrl;
    },
    formatWithValidation: function() {
        return formatWithValidation;
    },
    urlObjectKeys: function() {
        return urlObjectKeys;
    }
});
const _interop_require_wildcard = __turbopack_context__.r("[project]/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _querystring = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/router/utils/querystring.js [app-client] (ecmascript)"));
const slashedProtocols = /https?|ftp|gopher|file/;
function formatUrl(urlObj) {
    let { auth, hostname } = urlObj;
    let protocol = urlObj.protocol || '';
    let pathname = urlObj.pathname || '';
    let hash = urlObj.hash || '';
    let query = urlObj.query || '';
    let host = false;
    auth = auth ? encodeURIComponent(auth).replace(/%3A/i, ':') + '@' : '';
    if (urlObj.host) {
        host = auth + urlObj.host;
    } else if (hostname) {
        host = auth + (~hostname.indexOf(':') ? `[${hostname}]` : hostname);
        if (urlObj.port) {
            host += ':' + urlObj.port;
        }
    }
    if (query && typeof query === 'object') {
        query = String(_querystring.urlQueryToSearchParams(query));
    }
    let search = urlObj.search || query && `?${query}` || '';
    if (protocol && !protocol.endsWith(':')) protocol += ':';
    if (urlObj.slashes || (!protocol || slashedProtocols.test(protocol)) && host !== false) {
        host = '//' + (host || '');
        if (pathname && pathname[0] !== '/') pathname = '/' + pathname;
    } else if (!host) {
        host = '';
    }
    if (hash && hash[0] !== '#') hash = '#' + hash;
    if (search && search[0] !== '?') search = '?' + search;
    pathname = pathname.replace(/[?#]/g, encodeURIComponent);
    search = search.replace('#', '%23');
    return `${protocol}${host}${pathname}${search}${hash}`;
}
const urlObjectKeys = [
    'auth',
    'hash',
    'host',
    'hostname',
    'href',
    'path',
    'pathname',
    'port',
    'protocol',
    'query',
    'search',
    'slashes'
];
function formatWithValidation(url) {
    if ("TURBOPACK compile-time truthy", 1) {
        if (url !== null && typeof url === 'object') {
            Object.keys(url).forEach((key)=>{
                if (!urlObjectKeys.includes(key)) {
                    console.warn(`Unknown key passed via urlObject into url.format: ${key}`);
                }
            });
        }
    }
    return formatUrl(url);
}
}),
"[project]/node_modules/next/dist/shared/lib/router/utils/is-local-url.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isLocalURL", {
    enumerable: true,
    get: function() {
        return isLocalURL;
    }
});
const _utils = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)");
const _hasbasepath = __turbopack_context__.r("[project]/node_modules/next/dist/client/has-base-path.js [app-client] (ecmascript)");
function isLocalURL(url) {
    // prevent a hydration mismatch on href for url with anchor refs
    if (!(0, _utils.isAbsoluteUrl)(url)) return true;
    try {
        // absolute urls can be local if they are on the same origin
        const locationOrigin = (0, _utils.getLocationOrigin)();
        const resolved = new URL(url, locationOrigin);
        return resolved.origin === locationOrigin && (0, _hasbasepath.hasBasePath)(resolved.pathname);
    } catch (_) {
        return false;
    }
}
}),
"[project]/node_modules/next/dist/shared/lib/router/utils/querystring.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    assign: null,
    searchParamsToUrlQuery: null,
    urlQueryToSearchParams: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    assign: function() {
        return assign;
    },
    searchParamsToUrlQuery: function() {
        return searchParamsToUrlQuery;
    },
    urlQueryToSearchParams: function() {
        return urlQueryToSearchParams;
    }
});
function searchParamsToUrlQuery(searchParams) {
    const query = {};
    for (const [key, value] of searchParams.entries()){
        const existing = query[key];
        if (typeof existing === 'undefined') {
            query[key] = value;
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            query[key] = [
                existing,
                value
            ];
        }
    }
    return query;
}
function stringifyUrlQueryParam(param) {
    if (typeof param === 'string') {
        return param;
    }
    if (typeof param === 'number' && !isNaN(param) || typeof param === 'boolean') {
        return String(param);
    } else {
        return '';
    }
}
function urlQueryToSearchParams(query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)){
        if (Array.isArray(value)) {
            for (const item of value){
                searchParams.append(key, stringifyUrlQueryParam(item));
            }
        } else {
            searchParams.set(key, stringifyUrlQueryParam(value));
        }
    }
    return searchParams;
}
function assign(target, ...searchParamsList) {
    for (const searchParams of searchParamsList){
        for (const key of searchParams.keys()){
            target.delete(key);
        }
        for (const [key, value] of searchParams.entries()){
            target.append(key, value);
        }
    }
    return target;
}
}),
"[project]/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    DecodeError: null,
    MiddlewareNotFoundError: null,
    MissingStaticPage: null,
    NormalizeError: null,
    PageNotFoundError: null,
    SP: null,
    ST: null,
    WEB_VITALS: null,
    execOnce: null,
    getDisplayName: null,
    getLocationOrigin: null,
    getURL: null,
    isAbsoluteUrl: null,
    isResSent: null,
    loadGetInitialProps: null,
    normalizeRepeatedSlashes: null,
    stringifyError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    DecodeError: function() {
        return DecodeError;
    },
    MiddlewareNotFoundError: function() {
        return MiddlewareNotFoundError;
    },
    MissingStaticPage: function() {
        return MissingStaticPage;
    },
    NormalizeError: function() {
        return NormalizeError;
    },
    PageNotFoundError: function() {
        return PageNotFoundError;
    },
    SP: function() {
        return SP;
    },
    ST: function() {
        return ST;
    },
    WEB_VITALS: function() {
        return WEB_VITALS;
    },
    execOnce: function() {
        return execOnce;
    },
    getDisplayName: function() {
        return getDisplayName;
    },
    getLocationOrigin: function() {
        return getLocationOrigin;
    },
    getURL: function() {
        return getURL;
    },
    isAbsoluteUrl: function() {
        return isAbsoluteUrl;
    },
    isResSent: function() {
        return isResSent;
    },
    loadGetInitialProps: function() {
        return loadGetInitialProps;
    },
    normalizeRepeatedSlashes: function() {
        return normalizeRepeatedSlashes;
    },
    stringifyError: function() {
        return stringifyError;
    }
});
const WEB_VITALS = [
    'CLS',
    'FCP',
    'FID',
    'INP',
    'LCP',
    'TTFB'
];
function execOnce(fn) {
    let used = false;
    let result;
    return (...args)=>{
        if (!used) {
            used = true;
            result = fn(...args);
        }
        return result;
    };
}
// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;
const isAbsoluteUrl = (url)=>{
    // Fast path: an absolute URL must start with a letter (the scheme).
    // Check for a-z and A-Z without the cost of the regex.
    const c = url.charCodeAt(0);
    const isLetter = c >= 65 /* A */  && c <= 90 || c >= 97 /* a */  && c <= 122;
    /* z */ if (!isLetter) {
        return false;
    }
    return ABSOLUTE_URL_REGEX.test(url);
};
function getLocationOrigin() {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}
function getURL() {
    const { href } = window.location;
    const origin = getLocationOrigin();
    return href.substring(origin.length);
}
function getDisplayName(Component) {
    return typeof Component === 'string' ? Component : Component.displayName || Component.name || 'Unknown';
}
function isResSent(res) {
    return res.finished || res.headersSent;
}
function normalizeRepeatedSlashes(url) {
    const urlParts = url.split('?');
    const urlNoQuery = urlParts[0];
    return urlNoQuery // first we replace any non-encoded backslashes with forward
    // then normalize repeated forward slashes
    .replace(/\\/g, '/').replace(/\/\/+/g, '/') + (urlParts[1] ? `?${urlParts.slice(1).join('?')}` : '');
}
async function loadGetInitialProps(App, ctx) {
    if ("TURBOPACK compile-time truthy", 1) {
        if (App.prototype?.getInitialProps) {
            const message = `"${getDisplayName(App)}.getInitialProps()" is defined as an instance method - visit https://nextjs.org/docs/messages/get-initial-props-as-an-instance-method for more information.`;
            throw Object.defineProperty(new Error(message), "__NEXT_ERROR_CODE", {
                value: "E1035",
                enumerable: false,
                configurable: true
            });
        }
    }
    // when called from _app `ctx` is nested in `ctx`
    const res = ctx.res || ctx.ctx && ctx.ctx.res;
    if (!App.getInitialProps) {
        if (ctx.ctx && ctx.Component) {
            // @ts-ignore pageProps default
            return {
                pageProps: await loadGetInitialProps(ctx.Component, ctx.ctx)
            };
        }
        return {};
    }
    const props = await App.getInitialProps(ctx);
    if (res && isResSent(res)) {
        return props;
    }
    if (!props) {
        const message = `"${getDisplayName(App)}.getInitialProps()" should resolve to an object. But found "${props}" instead.`;
        throw Object.defineProperty(new Error(message), "__NEXT_ERROR_CODE", {
            value: "E1025",
            enumerable: false,
            configurable: true
        });
    }
    if ("TURBOPACK compile-time truthy", 1) {
        if (Object.keys(props).length === 0 && !ctx.ctx) {
            console.warn(`${getDisplayName(App)} returned an empty object from \`getInitialProps\`. This de-optimizes and prevents automatic static optimization. https://nextjs.org/docs/messages/empty-object-getInitialProps`);
        }
    }
    return props;
}
const SP = typeof performance !== 'undefined';
const ST = SP && [
    'mark',
    'measure',
    'getEntriesByName'
].every((method)=>typeof performance[method] === 'function');
class DecodeError extends Error {
}
class NormalizeError extends Error {
}
class PageNotFoundError extends Error {
    constructor(page){
        super();
        this.code = 'ENOENT';
        this.name = 'PageNotFoundError';
        this.message = `Cannot find module for page: ${page}`;
    }
}
class MissingStaticPage extends Error {
    constructor(page, message){
        super();
        this.message = `Failed to load static file for page: ${page} ${message}`;
    }
}
class MiddlewareNotFoundError extends Error {
    constructor(){
        super();
        this.code = 'ENOENT';
        this.message = `Cannot find the middleware module`;
    }
}
function stringifyError(error) {
    return JSON.stringify({
        message: error.message,
        stack: error.stack
    });
}
}),
"[project]/node_modules/next/dist/shared/lib/utils/error-once.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "errorOnce", {
    enumerable: true,
    get: function() {
        return errorOnce;
    }
});
let errorOnce = (_)=>{};
if ("TURBOPACK compile-time truthy", 1) {
    const errors = new Set();
    errorOnce = (msg)=>{
        if (!errors.has(msg)) {
            console.error(msg);
        }
        errors.add(msg);
    };
}
}),
]);

//# sourceMappingURL=_16n2aq9._.js.map