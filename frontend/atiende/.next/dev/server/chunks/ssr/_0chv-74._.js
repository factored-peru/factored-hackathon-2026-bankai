module.exports = [
"[project]/app/backoffice/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BackofficePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ModeSwitch$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ModeSwitch.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ConversationList$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ConversationList.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Chat.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ClientProfile$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ClientProfile.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Traceability$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Traceability.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$EventLogDrawer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/EventLogDrawer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backend.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/realtime.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/data.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
;
;
;
;
function BackofficePage() {
    const [isRealMode, setIsRealMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [actors, setActors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedActor, setSelectedActor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('demo-backoffice-1');
    const [isConnecting, setIsConnecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sessionRole, setSessionRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isDrawerOpen, setIsDrawerOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [conversations, setConversations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedThreadId, setSelectedThreadId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [traceStepsMap, setTraceStepsMap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [realTxEvidence, setRealTxEvidence] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [realCase, setRealCase] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isTyping, setIsTyping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [systemAlert, setSystemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [problemAlert, setProblemAlert] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Synchronize isRealMode with localStorage (defaulting to real mode)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const saved = localStorage.getItem('bankai_is_real_mode');
        if (saved === 'false') {
            setIsRealMode(false);
            setConversations(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MOCK_CONVERSATIONS"]);
            setSelectedThreadId('sim-thread-01');
            setTraceStepsMap(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MOCK_TRACE_STEPS"]);
        } else {
            setIsRealMode(true);
            localStorage.setItem('bankai_is_real_mode', 'true');
        }
    }, []);
    const handleToggleMode = (val)=>{
        setIsRealMode(val);
        localStorage.setItem('bankai_is_real_mode', val ? 'true' : 'false');
        if (!val) {
            setConversations(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MOCK_CONVERSATIONS"]);
            setSelectedThreadId('sim-thread-01');
            setTraceStepsMap(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MOCK_TRACE_STEPS"]);
        } else {
            setConversations([]);
            setSelectedThreadId(null);
            setTraceStepsMap({});
        }
    };
    const selectedConversation = conversations.find((c)=>c.threadId === selectedThreadId) || (conversations.length > 0 ? conversations[0] : null);
    const fetchRealData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const convsRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getConversations"])();
        if (convsRes.ok && convsRes.data) {
            setConversations(convsRes.data);
            if (convsRes.data.length > 0) {
                setSelectedThreadId((prev)=>{
                    if (!prev || !convsRes.data?.some((c)=>c.threadId === prev)) {
                        return convsRes.data[0].threadId;
                    }
                    return prev;
                });
            } else {
                setSelectedThreadId(null);
            }
        }
        const txRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getTransactionEvidence"])('demo-transaction-1');
        if (txRes.ok && txRes.data) setRealTxEvidence(txRes.data);
        const caseRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDisputeCase"])('demo-case-1');
        if (caseRes.ok && caseRes.data) setRealCase(caseRes.data);
    }, []);
    const onSnapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((snapshot)=>{
        setConversations((prev)=>{
            const idx = prev.findIndex((c)=>c.threadId === snapshot.threadId);
            if (idx >= 0) {
                const next = [
                    ...prev
                ];
                next[idx] = snapshot;
                return next;
            }
            return [
                snapshot,
                ...prev
            ];
        });
        // Update trace steps dynamically from snapshot
        if (snapshot.trace?.approvalId) {
            setTraceStepsMap((prevMap)=>{
                const currentSteps = prevMap[snapshot.threadId] || [];
                if (!currentSteps.some((s)=>s.approvalId === snapshot.trace.approvalId)) {
                    const newStep = {
                        id: `step-approval-${Date.now()}`,
                        title: `Escalamiento de Disputa (Aprobación Requerida)`,
                        timestamp: new Date().toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        isInvasive: true,
                        actorType: snapshot.trace.status === 'completed' ? 'human_approved' : snapshot.trace.status === 'denied' ? 'human_rejected' : 'human_pending',
                        approvalId: snapshot.trace.approvalId || undefined,
                        status: snapshot.trace.status === 'pending_approval' ? 'pending' : 'approved'
                    };
                    return {
                        ...prevMap,
                        [snapshot.threadId]: [
                            newStep,
                            ...currentSteps
                        ]
                    };
                }
                return prevMap;
            });
        }
    }, []);
    const onAlert = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(({ approvalId, threadId })=>{
        const targetThread = threadId || selectedThreadId || undefined;
        if (!targetThread) return;
        setTraceStepsMap((prevMap)=>{
            const currentSteps = prevMap[targetThread] || [];
            if (!currentSteps.some((s)=>s.approvalId === approvalId)) {
                const newStep = {
                    id: `step-alert-${Date.now()}`,
                    title: `Acción Invasiva: Desbloqueo / Escalamiento de Caso (#demo-case-1)`,
                    timestamp: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    isInvasive: true,
                    actorType: 'human_pending',
                    approvalId,
                    status: 'pending'
                };
                return {
                    ...prevMap,
                    [targetThread]: [
                        newStep,
                        ...currentSteps
                    ]
                };
            }
            return prevMap;
        });
    }, [
        selectedThreadId
    ]);
    const realtime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRealtime"])({
        enabled: isRealMode,
        onSnapshot,
        onAlert,
        onStateChange: ({ status })=>{
            setIsTyping(status === 'generating' || status === 'deciding' || status === 'queued');
        },
        onCompleted: ()=>setIsTyping(false),
        onProblem: ({ code })=>setProblemAlert(`Error del servidor: ${code}`)
    });
    const handleConnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (actorToUse = selectedActor)=>{
        setIsConnecting(true);
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createDemoSession"])(actorToUse);
        if (res.ok) {
            const meRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentSession"])();
            if (meRes.ok && meRes.data) {
                setSessionRole(meRes.data.roles[0] || 'backoffice');
            }
            realtime.connect();
            await fetchRealData();
        } else {
            alert(`Error de autenticación demo: ${res.problem?.title || 'No se pudo crear sesión'}`);
        }
        setIsConnecting(false);
    }, [
        selectedActor,
        realtime,
        fetchRealData
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isRealMode) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDemoActors"])().then((res)=>{
                if (res.ok && res.data) setActors(res.data);
            });
            if (!realtime.isConnected && !isConnecting) {
                handleConnect('demo-backoffice-1');
            }
        } else {
            setConversations(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MOCK_CONVERSATIONS"]);
            setTraceStepsMap(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MOCK_TRACE_STEPS"]);
        }
    }, [
        isRealMode,
        handleConnect,
        realtime.isConnected,
        isConnecting
    ]);
    const handleSelectThread = async (threadId)=>{
        setSelectedThreadId(threadId);
        if (isRealMode && threadId && !threadId.startsWith('sim-')) {
            realtime.subscribeThread(threadId);
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getConversationThread"])(threadId);
            if (res.ok && res.data) {
                onSnapshot(res.data);
            }
        }
    };
    const handleSendMessage = (text, attachmentIds = [])=>{
        if (!selectedThreadId) return;
        const newMsg = {
            messageId: `bo-msg-${Date.now()}`,
            role: 'backoffice',
            content: text,
            attachments: [],
            createdAt: new Date().toISOString()
        };
        setConversations((prev)=>prev.map((c)=>c.threadId === selectedThreadId ? {
                    ...c,
                    messages: [
                        ...c.messages,
                        newMsg
                    ]
                } : c));
        if (isRealMode) {
            realtime.sendChat({
                clientMessageId: newMsg.messageId,
                text,
                threadId: selectedThreadId,
                attachmentIds
            });
        }
    };
    const handleDecisionMade = (approvalId, decision, resultText)=>{
        if (!selectedThreadId) return;
        // Update step state in traceability
        setTraceStepsMap((prevMap)=>{
            const currentSteps = prevMap[selectedThreadId] || [];
            const updatedSteps = currentSteps.map((step)=>{
                if (step.approvalId === approvalId) {
                    return {
                        ...step,
                        actorType: decision === 'approved' ? 'human_approved' : 'human_rejected',
                        status: decision === 'approved' ? 'approved' : 'rejected'
                    };
                }
                return step;
            });
            return {
                ...prevMap,
                [selectedThreadId]: updatedSteps
            };
        });
        // Add system message to chat
        const sysMsg = {
            messageId: `sys-decision-${Date.now()}`,
            role: 'assistant',
            content: `[DECISIÓN REGISTRADA]: El operador ha ${decision === 'approved' ? 'APROBADO' : 'RECHAZADO'} el escalamiento. (${resultText})`,
            attachments: [],
            createdAt: new Date().toISOString()
        };
        setConversations((prev)=>prev.map((c)=>c.threadId === selectedThreadId ? {
                    ...c,
                    messages: [
                        ...c.messages,
                        sysMsg
                    ],
                    trace: {
                        ...c.trace,
                        status: decision === 'approved' ? 'completed' : 'denied'
                    }
                } : c));
    };
    const currentSteps = selectedThreadId && traceStepsMap[selectedThreadId] || [];
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
                fileName: "[project]/app/backoffice/page.tsx",
                lineNumber: 292,
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
                        children: "🛡️ Ambiente 2 — Consola de Backoffice (Operador)"
                    }, void 0, false, {
                        fileName: "[project]/app/backoffice/page.tsx",
                        lineNumber: 311,
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
                        fileName: "[project]/app/backoffice/page.tsx",
                        lineNumber: 314,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/backoffice/page.tsx",
                lineNumber: 310,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "backoffice-container",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ConversationList$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConversationList"], {
                        conversations: conversations,
                        selectedThreadId: selectedThreadId,
                        onSelectThread: handleSelectThread,
                        onRefresh: isRealMode ? fetchRealData : undefined
                    }, void 0, false, {
                        fileName: "[project]/app/backoffice/page.tsx",
                        lineNumber: 322,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "panel-card",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "panel-header",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        "Hilo Activo: ",
                                        selectedConversation?.ownerUserId || 'Cliente',
                                        " (#",
                                        selectedThreadId?.slice(0, 12),
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/backoffice/page.tsx",
                                    lineNumber: 332,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/backoffice/page.tsx",
                                lineNumber: 331,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Chat"], {
                                messages: selectedConversation?.messages || [],
                                onSendMessage: handleSendMessage,
                                isTyping: isTyping,
                                systemAlert: systemAlert,
                                problemAlert: problemAlert,
                                placeholder: "Responder como operador de Backoffice...",
                                isRealMode: isRealMode
                            }, void 0, false, {
                                fileName: "[project]/app/backoffice/page.tsx",
                                lineNumber: 337,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/backoffice/page.tsx",
                        lineNumber: 330,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            height: '100%'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ClientProfile$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClientProfile"], {
                                isRealMode: isRealMode,
                                realTxEvidence: realTxEvidence,
                                realCase: realCase
                            }, void 0, false, {
                                fileName: "[project]/app/backoffice/page.tsx",
                                lineNumber: 350,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Traceability$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Traceability"], {
                                steps: currentSteps,
                                isRealMode: isRealMode,
                                onDecisionMade: handleDecisionMade
                            }, void 0, false, {
                                fileName: "[project]/app/backoffice/page.tsx",
                                lineNumber: 356,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/backoffice/page.tsx",
                        lineNumber: 349,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/backoffice/page.tsx",
                lineNumber: 320,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$EventLogDrawer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EventLogDrawer"], {
                isOpen: isDrawerOpen,
                onClose: ()=>setIsDrawerOpen(false),
                logs: realtime.eventLogs,
                onClear: realtime.clearLogs
            }, void 0, false, {
                fileName: "[project]/app/backoffice/page.tsx",
                lineNumber: 364,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/backoffice/page.tsx",
        lineNumber: 291,
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
"[project]/components/ClientProfile.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ClientProfile",
    ()=>ClientProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/data.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
const ClientProfile = ({ isRealMode, realTxEvidence, realCase, simulatedProfile = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MOCK_CUSTOMER_PROFILE"] })=>{
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('datos');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "panel-card",
        style: {
            height: '240px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "panel-header",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "Perfil del Cliente"
                }, void 0, false, {
                    fileName: "[project]/components/ClientProfile.tsx",
                    lineNumber: 25,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/ClientProfile.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "tabs-header",
                role: "tablist",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `tab-btn ${activeTab === 'datos' ? 'active' : ''}`,
                        onClick: ()=>setActiveTab('datos'),
                        type: "button",
                        role: "tab",
                        "aria-selected": activeTab === 'datos',
                        children: "Datos"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientProfile.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `tab-btn ${activeTab === 'productos' ? 'active' : ''}`,
                        onClick: ()=>setActiveTab('productos'),
                        type: "button",
                        role: "tab",
                        "aria-selected": activeTab === 'productos',
                        children: "Productos"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientProfile.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `tab-btn ${activeTab === 'transacciones' ? 'active' : ''}`,
                        onClick: ()=>setActiveTab('transacciones'),
                        type: "button",
                        role: "tab",
                        "aria-selected": activeTab === 'transacciones',
                        children: "Transacciones"
                    }, void 0, false, {
                        fileName: "[project]/components/ClientProfile.tsx",
                        lineNumber: 47,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ClientProfile.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "tab-content",
                children: [
                    activeTab === 'datos' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: isRealMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "empty-state",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        fontWeight: 600,
                                        color: 'var(--text-ink)',
                                        marginBottom: '0.3rem'
                                    },
                                    children: "Evidencia Real del Caso"
                                }, void 0, false, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 63,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)'
                                    },
                                    children: [
                                        "ID Caso: ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: realCase?.caseId || 'demo-case-1'
                                        }, void 0, false, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 67,
                                            columnNumber: 28
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 66,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)'
                                    },
                                    children: [
                                        "Estado Caso: ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: realCase?.status || 'N/A'
                                        }, void 0, false, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 70,
                                            columnNumber: 32
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 69,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginTop: '0.8rem',
                                        fontStyle: 'italic',
                                        fontSize: '0.78rem',
                                        color: 'var(--text-muted)'
                                    },
                                    children: "ℹ️ Sin datos personales adicionales: el back todavía no expone esta información (Brecha de integración)."
                                }, void 0, false, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 72,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ClientProfile.tsx",
                            lineNumber: 62,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem',
                                fontSize: '0.85rem'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Nombre:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 78,
                                            columnNumber: 22
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        " ",
                                        simulatedProfile.name
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 78,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Identificación:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 79,
                                            columnNumber: 22
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        " ",
                                        simulatedProfile.documentId
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 79,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Email:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 80,
                                            columnNumber: 22
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        " ",
                                        simulatedProfile.email
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 80,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Teléfono:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 81,
                                            columnNumber: 22
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        " ",
                                        simulatedProfile.phone
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 81,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ClientProfile.tsx",
                            lineNumber: 77,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/ClientProfile.tsx",
                        lineNumber: 60,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    activeTab === 'productos' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: isRealMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "empty-state",
                            children: "Sin datos: el back todavía no expone esta información."
                        }, void 0, false, {
                            fileName: "[project]/components/ClientProfile.tsx",
                            lineNumber: 90,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            },
                            children: simulatedProfile.products?.map((prod)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '0.4rem 0.6rem',
                                        border: '1px solid var(--line-color)',
                                        borderRadius: 'var(--control-radius)',
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        fontWeight: 600
                                                    },
                                                    children: prod.name
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ClientProfile.tsx",
                                                    lineNumber: 108,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        color: 'var(--text-muted)',
                                                        fontSize: '0.72rem'
                                                    },
                                                    children: prod.type
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ClientProfile.tsx",
                                                    lineNumber: 109,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 107,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: 'var(--green-primary)',
                                                fontWeight: 600,
                                                fontSize: '0.75rem'
                                            },
                                            children: prod.status
                                        }, void 0, false, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 111,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, prod.id, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 96,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)))
                        }, void 0, false, {
                            fileName: "[project]/components/ClientProfile.tsx",
                            lineNumber: 94,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/ClientProfile.tsx",
                        lineNumber: 88,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    activeTab === 'transacciones' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: isRealMode ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: realTxEvidence ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '0.5rem',
                                    border: '1px solid var(--blue-primary)',
                                    borderRadius: 'var(--control-radius)',
                                    backgroundColor: 'var(--blue-soft)',
                                    fontSize: '0.8rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontWeight: 700,
                                            color: 'var(--blue-primary)'
                                        },
                                        children: [
                                            "Tx: ",
                                            realTxEvidence.transactionId
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientProfile.tsx",
                                        lineNumber: 135,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            "Monto (Bucket): ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: realTxEvidence.amountBucket
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientProfile.tsx",
                                                lineNumber: 138,
                                                columnNumber: 42
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            " (",
                                            realTxEvidence.currency,
                                            ")"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientProfile.tsx",
                                        lineNumber: 138,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            "Estado Tx: ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: realTxEvidence.status
                                            }, void 0, false, {
                                                fileName: "[project]/components/ClientProfile.tsx",
                                                lineNumber: 139,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientProfile.tsx",
                                        lineNumber: 139,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            marginTop: '0.2rem'
                                        },
                                        children: [
                                            "Origen: ",
                                            realTxEvidence.provenance,
                                            " (",
                                            realTxEvidence.version,
                                            ")"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ClientProfile.tsx",
                                        lineNumber: 140,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ClientProfile.tsx",
                                lineNumber: 126,
                                columnNumber: 19
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "empty-state",
                                children: "Cargando evidencia de transacción..."
                            }, void 0, false, {
                                fileName: "[project]/components/ClientProfile.tsx",
                                lineNumber: 145,
                                columnNumber: 19
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/components/ClientProfile.tsx",
                            lineNumber: 124,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            },
                            children: simulatedProfile.transactions?.map((tx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        padding: '0.4rem 0.6rem',
                                        border: '1px solid var(--line-color)',
                                        borderRadius: 'var(--control-radius)',
                                        fontSize: '0.78rem'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontWeight: 600
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: tx.merchant
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ClientProfile.tsx",
                                                    lineNumber: 163,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: tx.amountBucket
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ClientProfile.tsx",
                                                    lineNumber: 164,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 162,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: 'var(--text-muted)',
                                                fontSize: '0.7rem'
                                            },
                                            children: [
                                                tx.date,
                                                " — Estado: ",
                                                tx.status
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ClientProfile.tsx",
                                            lineNumber: 166,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, tx.id, true, {
                                    fileName: "[project]/components/ClientProfile.tsx",
                                    lineNumber: 153,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)))
                        }, void 0, false, {
                            fileName: "[project]/components/ClientProfile.tsx",
                            lineNumber: 151,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/ClientProfile.tsx",
                        lineNumber: 122,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ClientProfile.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/ClientProfile.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/ConversationList.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConversationList",
    ()=>ConversationList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
const ConversationList = ({ conversations, selectedThreadId, onSelectThread, onRefresh })=>{
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const filtered = conversations.filter((c)=>{
        const text = `${c.threadId} ${c.ownerUserId} ${c.trace?.status || ''}`.toLowerCase();
        return text.includes(searchTerm.toLowerCase());
    });
    const getStatusLabel = (status)=>{
        switch(status){
            case 'pending_approval':
                return {
                    label: 'Necesita aprobación',
                    isRed: true
                };
            case 'escalated':
                return {
                    label: 'Escalado',
                    isRed: true
                };
            case 'completed':
                return {
                    label: 'Finalizado',
                    isRed: false
                };
            case 'queued':
            case 'generating':
            case 'deciding':
            case 'normalizing':
            case 'retrieving':
                return {
                    label: 'En proceso',
                    isRed: false
                };
            case 'denied':
                return {
                    label: 'Rechazado',
                    isRed: false
                };
            default:
                return {
                    label: status || 'En proceso',
                    isRed: false
                };
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "panel-card",
        style: {
            height: '100%'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "panel-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            "Conversaciones (",
                            conversations.length,
                            ")"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ConversationList.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    onRefresh && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onRefresh,
                        className: "btn-secondary",
                        style: {
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem'
                        },
                        title: "Refrescar lista",
                        type: "button",
                        children: "🔄"
                    }, void 0, false, {
                        fileName: "[project]/components/ConversationList.tsx",
                        lineNumber: 52,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ConversationList.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--line-color)'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    placeholder: "Buscar por cliente o ID...",
                    value: searchTerm,
                    onChange: (e)=>setSearchTerm(e.target.value),
                    style: {
                        width: '100%',
                        padding: '0.45rem 0.75rem',
                        border: '1px solid var(--line-color)',
                        borderRadius: 'var(--control-radius)',
                        fontSize: '0.85rem'
                    }
                }, void 0, false, {
                    fileName: "[project]/components/ConversationList.tsx",
                    lineNumber: 65,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/ConversationList.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                },
                children: filtered.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '1.5rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem'
                    },
                    children: "No se encontraron conversaciones."
                }, void 0, false, {
                    fileName: "[project]/components/ConversationList.tsx",
                    lineNumber: 82,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)) : filtered.map((item)=>{
                    const isSelected = item.threadId === selectedThreadId;
                    const statusInfo = getStatusLabel(item.trace?.status);
                    const lastMsg = item.messages?.[item.messages.length - 1];
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: ()=>onSelectThread(item.threadId),
                        style: {
                            padding: '0.85rem 1rem',
                            borderBottom: '1px solid var(--line-color)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'var(--blue-soft)' : 'transparent',
                            borderLeft: isSelected ? '4px solid var(--blue-primary)' : '4px solid transparent',
                            transition: 'background-color 0.15s ease'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '0.3rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            color: 'var(--text-ink)'
                                        },
                                        children: item.ownerUserId
                                    }, void 0, false, {
                                        fileName: "[project]/components/ConversationList.tsx",
                                        lineNumber: 105,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    statusInfo.isRed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--red-primary)',
                                            display: 'inline-block'
                                        },
                                        title: "Requiere atención inmediata"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ConversationList.tsx",
                                        lineNumber: 109,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ConversationList.tsx",
                                lineNumber: 104,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '0.8rem',
                                    color: 'var(--text-muted)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginBottom: '0.4rem'
                                },
                                children: lastMsg ? lastMsg.content : 'Sin mensajes'
                            }, void 0, false, {
                                fileName: "[project]/components/ConversationList.tsx",
                                lineNumber: 122,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.75rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: 'var(--text-muted)',
                                            fontStyle: 'italic'
                                        },
                                        children: [
                                            "Estado: ",
                                            statusInfo.label
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ConversationList.tsx",
                                        lineNumber: 127,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: 'var(--text-muted)',
                                            fontSize: '0.7rem'
                                        },
                                        children: [
                                            "Rev: #",
                                            item.revision
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ConversationList.tsx",
                                        lineNumber: 130,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ConversationList.tsx",
                                lineNumber: 126,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, item.threadId, true, {
                        fileName: "[project]/components/ConversationList.tsx",
                        lineNumber: 92,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0));
                })
            }, void 0, false, {
                fileName: "[project]/components/ConversationList.tsx",
                lineNumber: 80,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/ConversationList.tsx",
        lineNumber: 48,
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
"[project]/components/Traceability.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Traceability",
    ()=>Traceability
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backend.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
const Traceability = ({ steps, isRealMode, onDecisionMade })=>{
    const [loadingApprovalId, setLoadingApprovalId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const handleDecision = async (approvalId, decision)=>{
        if (!approvalId) {
            alert('⚠️ No se puede ejecutar la decisión: la acción no trae un approvalId válido de aprobación.');
            return;
        }
        setLoadingApprovalId(approvalId);
        if (isRealMode) {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decideEscalation"])(approvalId, decision);
            if (res.ok && res.data) {
                const statusText = decision === 'approved' ? 'Escalamiento Aprobado' : 'Escalamiento Rechazado';
                if (onDecisionMade) {
                    onDecisionMade(approvalId, decision, `${statusText} (Caso #${res.data.case?.caseId})`);
                }
            } else {
                alert(`Error al registrar decisión: ${res.problem?.title || 'Fallo de petición'}`);
            }
        } else {
            // Simulated decision
            setTimeout(()=>{
                const statusText = decision === 'approved' ? 'Escalamiento Aprobado' : 'Escalamiento Rechazado';
                if (onDecisionMade) {
                    onDecisionMade(approvalId, decision, `${statusText} (Modo Simulado)`);
                }
            }, 400);
        }
        setLoadingApprovalId(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "panel-card",
        style: {
            flex: 1,
            minHeight: '300px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "panel-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "Trazabilidad de Acciones"
                    }, void 0, false, {
                        fileName: "[project]/components/Traceability.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 500
                        },
                        children: [
                            "(",
                            steps.length,
                            " pasos)"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Traceability.tsx",
                        lineNumber: 54,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/Traceability.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "trace-list",
                role: "feed",
                "aria-label": "Lista de trazabilidad de acciones",
                children: steps.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "empty-state",
                    children: "Sin acciones registradas para este hilo aún."
                }, void 0, false, {
                    fileName: "[project]/components/Traceability.tsx",
                    lineNumber: 61,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)) : steps.map((step)=>{
                    const isPending = step.actorType === 'human_pending';
                    const isApproved = step.actorType === 'human_approved';
                    const isRejected = step.actorType === 'human_rejected';
                    let ringClass = 'blue';
                    if (isPending) ringClass = 'red';
                    if (isApproved) ringClass = 'green';
                    if (isRejected) ringClass = 'gray';
                    let tagLabel = 'Bot/Agente AI';
                    let tagClass = 'bot';
                    if (isPending) {
                        tagLabel = 'Humano (en espera)';
                        tagClass = 'human-pending';
                    } else if (isApproved) {
                        tagLabel = 'Humano · Aprobado por Operador';
                        tagClass = 'human-approved';
                    } else if (isRejected) {
                        tagLabel = 'Humano · Rechazado por Operador';
                        tagClass = 'human-rejected';
                    }
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "trace-item",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `trace-ring ${ringClass}`
                            }, void 0, false, {
                                fileName: "[project]/components/Traceability.tsx",
                                lineNumber: 91,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "trace-content",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `trace-tag ${tagClass}`,
                                                children: tagLabel
                                            }, void 0, false, {
                                                fileName: "[project]/components/Traceability.tsx",
                                                lineNumber: 95,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.7rem',
                                                    color: 'var(--text-muted)'
                                                },
                                                children: step.timestamp
                                            }, void 0, false, {
                                                fileName: "[project]/components/Traceability.tsx",
                                                lineNumber: 96,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/Traceability.tsx",
                                        lineNumber: 94,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "trace-title",
                                        children: step.title
                                    }, void 0, false, {
                                        fileName: "[project]/components/Traceability.tsx",
                                        lineNumber: 99,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    isPending && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            marginTop: '0.4rem'
                                        },
                                        children: !step.approvalId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: 'var(--red-primary)',
                                                fontSize: '0.75rem',
                                                fontStyle: 'italic'
                                            },
                                            children: "⚠ Acción invasiva sin approvalId. No se puede decidir."
                                        }, void 0, false, {
                                            fileName: "[project]/components/Traceability.tsx",
                                            lineNumber: 104,
                                            columnNumber: 25
                                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "trace-actions",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "btn-decision-no",
                                                    onClick: ()=>handleDecision(step.approvalId, 'rejected'),
                                                    disabled: loadingApprovalId === step.approvalId,
                                                    type: "button",
                                                    children: loadingApprovalId === step.approvalId ? '...' : 'NO'
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Traceability.tsx",
                                                    lineNumber: 109,
                                                    columnNumber: 27
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "btn-decision-yes",
                                                    onClick: ()=>handleDecision(step.approvalId, 'approved'),
                                                    disabled: loadingApprovalId === step.approvalId,
                                                    type: "button",
                                                    children: loadingApprovalId === step.approvalId ? '...' : 'SÍ'
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Traceability.tsx",
                                                    lineNumber: 117,
                                                    columnNumber: 27
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/Traceability.tsx",
                                            lineNumber: 108,
                                            columnNumber: 25
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/components/Traceability.tsx",
                                        lineNumber: 102,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/Traceability.tsx",
                                lineNumber: 93,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, step.id, true, {
                        fileName: "[project]/components/Traceability.tsx",
                        lineNumber: 90,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0));
                })
            }, void 0, false, {
                fileName: "[project]/components/Traceability.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/Traceability.tsx",
        lineNumber: 51,
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

//# sourceMappingURL=_0chv-74._.js.map