module.exports = [
"[project]/app/chat/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ModeSwitch$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ModeSwitch.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Chat.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$EventLogDrawer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/EventLogDrawer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backend.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/realtime.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
function ChatPage() {
    const [isRealMode, setIsRealMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [actors, setActors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedActor, setSelectedActor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('demo-customer-1');
    const [isConnecting, setIsConnecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sessionRole, setSessionRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isDrawerOpen, setIsDrawerOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [currentThreadId, setCurrentThreadId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isTyping, setIsTyping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [systemAlert, setSystemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [problemAlert, setProblemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Streaming accumulation buffer
    const streamingMsgIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const streamingTextRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])('');
    // Synchronize isRealMode with localStorage (defaulting to real mode)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const saved = localStorage.getItem('bankai_is_real_mode');
        if (saved === 'false') {
            setIsRealMode(false);
        } else {
            setIsRealMode(true);
            localStorage.setItem('bankai_is_real_mode', 'true');
        }
    }, []);
    const handleToggleMode = (val)=>{
        setIsRealMode(val);
        localStorage.setItem('bankai_is_real_mode', val ? 'true' : 'false');
    };
    const onSnapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((snapshot)=>{
        if (snapshot?.threadId) {
            setCurrentThreadId(snapshot.threadId);
        }
        if (Array.isArray(snapshot?.messages)) {
            setMessages(snapshot.messages);
        }
    }, []);
    const onStateChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(({ status })=>{
        if (status === 'generating' || status === 'deciding' || status === 'normalizing' || status === 'queued') {
            setIsTyping(true);
        } else if (status === 'completed' || status === 'pending_approval' || status === 'failed') {
            setIsTyping(false);
        }
    }, []);
    const onDelta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(({ messageId, value })=>{
        setIsTyping(true);
        if (streamingMsgIdRef.current !== messageId) {
            streamingMsgIdRef.current = messageId;
            streamingTextRef.current = value;
            setMessages((prev)=>{
                if (prev.some((m)=>m.messageId === messageId)) {
                    return prev.map((m)=>m.messageId === messageId ? {
                            ...m,
                            content: value
                        } : m);
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
            });
        } else {
            streamingTextRef.current += value;
            const updatedContent = streamingTextRef.current;
            setMessages((prev)=>prev.map((m)=>m.messageId === messageId ? {
                        ...m,
                        content: updatedContent
                    } : m));
        }
    }, []);
    const onCompleted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(({ response })=>{
        setIsTyping(false);
        if (streamingMsgIdRef.current) {
            const msgId = streamingMsgIdRef.current;
            setMessages((prev)=>prev.map((m)=>m.messageId === msgId ? {
                        ...m,
                        content: response
                    } : m));
        } else {
            setMessages((prev)=>{
                if (prev.some((m)=>m.content === response)) return prev;
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
            });
        }
        streamingMsgIdRef.current = null;
        streamingTextRef.current = '';
    }, []);
    const onAlert = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(({ approvalId })=>{
        setSystemAlert(`Se ha requerido una aprobación humana (Approval ID: ${approvalId.slice(0, 8)}...). Un operador de backoffice revisará el caso.`);
    }, []);
    const onProblem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(({ code })=>{
        setIsTyping(false);
        setProblemAlert(`Se produjo un problema en la ejecución del backend (Código: ${code}).`);
    }, []);
    const realtime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRealtime"])({
        enabled: isRealMode,
        onSnapshot,
        onStateChange,
        onDelta,
        onCompleted,
        onAlert,
        onProblem
    });
    const handleConnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (actorToUse = selectedActor)=>{
        setIsConnecting(true);
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createDemoSession"])(actorToUse);
        if (res.ok) {
            const meRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentSession"])();
            if (meRes.ok && meRes.data) {
                setSessionRole(meRes.data.roles[0] || 'customer');
            }
            realtime.connect();
        } else {
            alert(`Error de autenticación demo: ${res.problem?.title || 'No se pudo crear la sesión'}`);
        }
        setIsConnecting(false);
    }, [
        selectedActor,
        realtime
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isRealMode) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDemoActors"])().then((res)=>{
                if (res.ok && res.data) setActors(res.data);
            });
            if (!realtime.isConnected && !isConnecting) {
                handleConnect('demo-customer-1');
            }
        }
    }, [
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: 'var(--bg-color)'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ModeSwitch$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ModeSwitch"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.6rem 1.5rem',
                    backgroundColor: 'var(--surface-color)',
                    borderBottom: '1px solid var(--line-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                style: {
                    flex: 1,
                    padding: '1.25rem',
                    maxWidth: '900px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "panel-card",
                    style: {
                        flex: 1
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Chat"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$EventLogDrawer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EventLogDrawer"], {
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
}),
"[project]/components/Chat.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Chat",
    ()=>Chat
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backend.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
const Chat = ({ messages, onSendMessage, isTyping = false, systemAlert = null, problemAlert = null, placeholder = 'Escribe tu mensaje aquí... (Enter para enviar, Shift+Enter para nueva línea)', isRealMode = false })=>{
    const [inputText, setInputText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [uploading, setUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [attachments, setAttachments] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const messagesEndRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const scrollToBottom = ()=>{
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        });
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        scrollToBottom();
    }, [
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
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["uploadAttachment"])(file, kind);
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "chat-container",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "chat-messages",
                role: "log",
                "aria-label": "Mensajes de conversación",
                children: [
                    messages.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            padding: '2rem 1rem',
                            textAlign: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    maxWidth: '400px',
                                    margin: '0 auto'
                                },
                                children: suggestions.map((suggestion, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `chat-bubble ${bubbleClass}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: msg.content
                                }, void 0, false, {
                                    fileName: "[project]/components/Chat.tsx",
                                    lineNumber: 164,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                msg.attachments && msg.attachments.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginTop: '0.5rem',
                                        display: 'flex',
                                        gap: '0.4rem',
                                        flexWrap: 'wrap'
                                    },
                                    children: msg.attachments.map((att, attIdx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                    systemAlert && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-bubble system",
                        children: [
                            "⚠️ ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
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
                    problemAlert && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-bubble system-problem",
                        children: [
                            "🛑 ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
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
                    isTyping && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "typing-indicator",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "chat-input-area",
                children: [
                    attachments.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "attachment-preview",
                        children: attachments.map((att)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "attachment-chip",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "📎 ",
                                            att.kind === 'image' ? 'Imagen' : 'Audio'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/Chat.tsx",
                                        lineNumber: 217,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-form",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
}),
"[project]/components/EventLogDrawer.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EventLogDrawer",
    ()=>EventLogDrawer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
const EventLogDrawer = ({ isOpen, onClose, logs, onClear })=>{
    const [copied, setCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    if (!isOpen) return null;
    const copyAll = ()=>{
        navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
        setCopied(true);
        setTimeout(()=>setCopied(false), 2000);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #23344E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '0.5rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.8rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: '0.78rem'
                },
                children: logs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                }, ("TURBOPACK compile-time value", void 0)) : logs.map((log, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            backgroundColor: log.isWarning ? '#3D1518' : '#17253B',
                            border: log.isWarning ? '1px solid #D42F3C' : '1px solid #23344E',
                            borderRadius: '6px',
                            padding: '0.6rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.3rem',
                                    color: log.isWarning ? '#FCE7E9' : '#8CA3CB',
                                    fontWeight: 'bold'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            log.isWarning && '⚠️ ',
                                            log.type
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/EventLogDrawer.tsx",
                                        lineNumber: 140,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
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
}),
"[project]/components/ModeSwitch.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ModeSwitch",
    ()=>ModeSwitch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/data.ts [app-ssr] (ecmascript)");
'use client';
;
;
const ModeSwitch = ({ actors, selectedActor, onSelectActor, onConnect, isConnecting, isConnected, sessionRole })=>{
    const activeActors = actors.length > 0 ? actors : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SIMULATED_ACTORS"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
            className: "app-header",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "brand-title",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "🏦 Bankai Dispute Support"
                        }, void 0, false, {
                            fileName: "[project]/components/ModeSwitch.tsx",
                            lineNumber: 32,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "connection-inputs",
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
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
                                    children: activeActors.map((actor)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `status-badge ${isConnected ? 'connected' : 'disconnected'}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: `status-dot ${isConnected ? 'connected' : 'disconnected'}`
                                }, void 0, false, {
                                    fileName: "[project]/components/ModeSwitch.tsx",
                                    lineNumber: 69,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
}),
"[project]/lib/backend.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/lib/data.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/lib/realtime.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useRealtime",
    ()=>useRealtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
const WS_URL = ("TURBOPACK compile-time value", "ws://localhost:3000/v1/realtime") || 'ws://localhost:3000/v1/realtime';
function useRealtime(options) {
    const [isConnected, setIsConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [eventLogs, setEventLogs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const wsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const addLog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((evt)=>{
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
        setEventLogs((prev)=>[
                logItem,
                ...prev
            ]);
    }, []);
    const connect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (!options.enabled) return;
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }
        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onopen = ()=>{
                setIsConnected(true);
            };
            ws.onmessage = (event)=>{
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
            };
            ws.onclose = ()=>{
                setIsConnected(false);
            };
            ws.onerror = (err)=>{
                setIsConnected(false);
            };
        } catch (e) {
            console.warn('WS connection attempt pending session cookie initialization');
        }
    }, [
        options,
        addLog
    ]);
    const disconnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);
    const sendChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((data)=>{
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
    }, [
        addLog
    ]);
    const subscribeThread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>{
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
    }, [
        addLog
    ]);
    const clearLogs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setEventLogs([]);
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!options.enabled) {
            disconnect();
        }
        return ()=>{
            disconnect();
        };
    }, [
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
}),
];

//# sourceMappingURL=_08a05vw._.js.map