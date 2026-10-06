module.exports = [
"[project]/app/pruebas/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PruebasPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backend.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function PruebasPage() {
    const [results, setResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [activeActorId, setActiveActorId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('demo-customer-1');
    const [autoThreadId, setAutoThreadId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('demo-thread-1');
    const [autoApprovalId, setAutoApprovalId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [autoCaseId, setAutoCaseId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('demo-case-1');
    const [autoTransactionId, setAutoTransactionId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('demo-transaction-1');
    const [autoDisputeId, setAutoDisputeId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('demo-dispute-1');
    // Helper to execute and record endpoint calls
    const runTest = async (key, name, fn)=>{
        const start = performance.now();
        try {
            const res = await fn();
            const elapsed = Math.round(performance.now() - start);
            setResults((prev)=>({
                    ...prev,
                    [key]: {
                        endpoint: name,
                        timeMs: elapsed,
                        status: res.status || (res.ok ? 200 : 500),
                        data: res.ok ? res.data : res.problem || res,
                        isError: !res.ok
                    }
                }));
            // Auto-fill IDs if present
            if (res.data?.approvalId) setAutoApprovalId(res.data.approvalId);
            if (res.data?.threadId) setAutoThreadId(res.data.threadId);
            if (res.data?.caseId) setAutoCaseId(res.data.caseId);
            if (res.data?.transactionId) setAutoTransactionId(res.data.transactionId);
            if (res.data?.disputeId) setAutoDisputeId(res.data.disputeId);
        } catch (err) {
            const elapsed = Math.round(performance.now() - start);
            setResults((prev)=>({
                    ...prev,
                    [key]: {
                        endpoint: name,
                        timeMs: elapsed,
                        status: 500,
                        data: {
                            error: err.message || 'Excepción no capturada'
                        },
                        isError: true
                    }
                }));
        }
    };
    const renderCardResult = (key)=>{
        const result = results[key];
        if (!result) return null;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                marginTop: '0.8rem',
                backgroundColor: '#0E1A2B',
                borderRadius: '6px',
                padding: '0.75rem',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: result.isError ? '#FCE7E9' : '#D6DDE8',
                borderLeft: result.isError ? '4px solid var(--red-primary)' : '4px solid var(--green-primary)'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.4rem',
                        color: '#8CA3CB',
                        fontWeight: 'bold'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "Estado HTTP: ",
                                result.status
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/pruebas/page.tsx",
                            lineNumber: 96,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "Tiempo: ",
                                result.timeMs,
                                " ms"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/pruebas/page.tsx",
                            lineNumber: 97,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/pruebas/page.tsx",
                    lineNumber: 95,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    style: {
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                    },
                    children: JSON.stringify(result.data, null, 2)
                }, void 0, false, {
                    fileName: "[project]/app/pruebas/page.tsx",
                    lineNumber: 99,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/pruebas/page.tsx",
            lineNumber: 83,
            columnNumber: 7
        }, this);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            backgroundColor: 'var(--bg-color)'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "app-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "brand-title",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "🧪 Consola de Pruebas Backend API"
                        }, void 0, false, {
                            fileName: "[project]/app/pruebas/page.tsx",
                            lineNumber: 111,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/pruebas/page.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        className: "btn-secondary",
                        children: "← Volver al Inicio"
                    }, void 0, false, {
                        fileName: "[project]/app/pruebas/page.tsx",
                        lineNumber: 113,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/pruebas/page.tsx",
                lineNumber: 109,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                style: {
                    flex: 1,
                    padding: '2rem 1.5rem',
                    maxWidth: '1100px',
                    width: '100%',
                    margin: '0 auto'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            fontSize: '0.95rem',
                            color: 'var(--text-muted)',
                            marginBottom: '1.5rem'
                        },
                        children: [
                            "Ejecuta pruebas directas sobre los endpoints REST del backend corriendo en ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "http://localhost:3000"
                            }, void 0, false, {
                                fileName: "[project]/app/pruebas/page.tsx",
                                lineNumber: 120,
                                columnNumber: 86
                            }, this),
                            ". Los IDs capturados se autocompletan para las pruebas encadenadas."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/pruebas/page.tsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "panel-card",
                                style: {
                                    padding: '1.25rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.5rem',
                                            color: 'var(--blue-primary)'
                                        },
                                        children: "1. Salud del Proceso (/v1/health)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 126,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: '0.8rem'
                                        },
                                        children: "Verifica el estado de liveness y readiness del backend Fastify."
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 129,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.6rem'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-primary",
                                                onClick: ()=>runTest('s1_live', 'GET /v1/health/live', __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getLiveHealth"]),
                                                type: "button",
                                                children: "Probar /v1/health/live"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 133,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s1_ready', 'GET /v1/health/ready', __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getReadiness"]),
                                                type: "button",
                                                children: "Probar /v1/health/ready"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 140,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 132,
                                        columnNumber: 13
                                    }, this),
                                    renderCardResult('s1_live'),
                                    renderCardResult('s1_ready')
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/pruebas/page.tsx",
                                lineNumber: 125,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "panel-card",
                                style: {
                                    padding: '1.25rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.5rem',
                                            color: 'var(--blue-primary)'
                                        },
                                        children: "2. Sesión Demo y Contexto (/v1/demo y /v1/me)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 154,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: '0.8rem'
                                        },
                                        children: "Consulta los alias demo, crea la cookie de sesión autenticada y confirma los roles y capacidades."
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 157,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.6rem',
                                            flexWrap: 'wrap',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s2_actors', 'GET /v1/demo/actors', __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDemoActors"]),
                                                type: "button",
                                                children: "Listar Actores Demo"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 161,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                className: "select-actor",
                                                value: activeActorId,
                                                onChange: (e)=>setActiveActorId(e.target.value),
                                                style: {
                                                    height: '36px',
                                                    border: '1px solid var(--line-color)',
                                                    color: 'var(--text-ink)',
                                                    backgroundColor: 'var(--bg-color)'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "demo-customer-1",
                                                        children: "demo-customer-1 (Cliente)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/pruebas/page.tsx",
                                                        lineNumber: 174,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "demo-backoffice-1",
                                                        children: "demo-backoffice-1 (Operador)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/pruebas/page.tsx",
                                                        lineNumber: 175,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 168,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-primary",
                                                onClick: ()=>runTest('s2_sess', `POST /v1/demo/sessions (${activeActorId})`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createDemoSession"])(activeActorId)),
                                                type: "button",
                                                children: "Crear Sesión Demo"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 177,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s2_me', 'GET /v1/me', __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentSession"]),
                                                type: "button",
                                                children: "Probar /v1/me"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 184,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 160,
                                        columnNumber: 13
                                    }, this),
                                    renderCardResult('s2_actors'),
                                    renderCardResult('s2_sess'),
                                    renderCardResult('s2_me')
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/pruebas/page.tsx",
                                lineNumber: 153,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "panel-card",
                                style: {
                                    padding: '1.25rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.5rem',
                                            color: 'var(--blue-primary)'
                                        },
                                        children: "3. Consulta de Evidencias (Fixtures, Transacciones, Disputas, Casos)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 199,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: '0.8rem'
                                        },
                                        children: "Obtén las fixtures demo e inspecciona la evidencia sintética de transacciones, disputas y casos."
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 202,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.6rem',
                                            flexWrap: 'wrap'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s3_fixtures', 'GET /v1/demo/fixtures', __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDemoFixtures"]),
                                                type: "button",
                                                children: "Obtener Fixtures Demo"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 206,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-primary",
                                                onClick: ()=>runTest('s3_tx', `GET /v1/transactions/${autoTransactionId}`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getTransactionEvidence"])(autoTransactionId)),
                                                type: "button",
                                                children: [
                                                    "Evidencia Transacción (",
                                                    autoTransactionId,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 213,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s3_disp', `GET /v1/disputes/${autoDisputeId}`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDisputeEvidence"])(autoDisputeId)),
                                                type: "button",
                                                children: [
                                                    "Evidencia Disputa (",
                                                    autoDisputeId,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 220,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s3_case', `GET /v1/dispute-cases/${autoCaseId}`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDisputeCase"])(autoCaseId)),
                                                type: "button",
                                                children: [
                                                    "Evidencia Caso (",
                                                    autoCaseId,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 227,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 205,
                                        columnNumber: 13
                                    }, this),
                                    renderCardResult('s3_fixtures'),
                                    renderCardResult('s3_tx'),
                                    renderCardResult('s3_disp'),
                                    renderCardResult('s3_case')
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/pruebas/page.tsx",
                                lineNumber: 198,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "panel-card",
                                style: {
                                    padding: '1.25rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.5rem',
                                            color: 'var(--blue-primary)'
                                        },
                                        children: "4. Gestión de Conversaciones (/v1/conversations)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 243,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: '0.8rem'
                                        },
                                        children: "Lista los snapshots de conversaciones autorizadas y consulta un hilo específico por threadId."
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 246,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.6rem',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-primary",
                                                onClick: ()=>runTest('s4_list', 'GET /v1/conversations', __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getConversations"]),
                                                type: "button",
                                                children: "Listar Conversaciones"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 250,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                placeholder: "threadId...",
                                                value: autoThreadId,
                                                onChange: (e)=>setAutoThreadId(e.target.value),
                                                style: {
                                                    padding: '0.45rem 0.6rem',
                                                    border: '1px solid var(--line-color)',
                                                    borderRadius: 'var(--control-radius)',
                                                    fontSize: '0.85rem'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 257,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s4_thread', `GET /v1/conversations/${autoThreadId}`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getConversationThread"])(autoThreadId)),
                                                type: "button",
                                                children: "Consultar Hilo"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 264,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 249,
                                        columnNumber: 13
                                    }, this),
                                    renderCardResult('s4_list'),
                                    renderCardResult('s4_thread')
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/pruebas/page.tsx",
                                lineNumber: 242,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "panel-card",
                                style: {
                                    padding: '1.25rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.5rem',
                                            color: 'var(--blue-primary)'
                                        },
                                        children: "5. Escalación y Aprobación de Disputas (Acciones Invasivas)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 278,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: '0.8rem'
                                        },
                                        children: "Solicita el escalamiento mock (crea un approvalId) y toma la decisión como operador (approved/rejected)."
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 281,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.6rem',
                                            flexWrap: 'wrap',
                                            alignItems: 'center'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-primary",
                                                onClick: ()=>runTest('s5_esc', `POST /v1/dispute-cases/${autoCaseId}/escalations`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["requestEscalation"])(autoCaseId)),
                                                type: "button",
                                                children: [
                                                    "Solicitar Escalamiento (Caso ",
                                                    autoCaseId,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 285,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "text",
                                                placeholder: "approvalId...",
                                                value: autoApprovalId,
                                                onChange: (e)=>setAutoApprovalId(e.target.value),
                                                style: {
                                                    padding: '0.45rem 0.6rem',
                                                    border: '1px solid var(--line-color)',
                                                    borderRadius: 'var(--control-radius)',
                                                    fontSize: '0.85rem',
                                                    width: '250px'
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 293,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-primary",
                                                onClick: ()=>runTest('s5_app', `POST /v1/approvals/${autoApprovalId}/decisions (approved)`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decideEscalation"])(autoApprovalId, 'approved')),
                                                disabled: !autoApprovalId,
                                                type: "button",
                                                style: {
                                                    backgroundColor: 'var(--green-primary)'
                                                },
                                                children: "Aprobar (SÍ)"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 301,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "btn-secondary",
                                                onClick: ()=>runTest('s5_rej', `POST /v1/approvals/${autoApprovalId}/decisions (rejected)`, ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decideEscalation"])(autoApprovalId, 'rejected')),
                                                disabled: !autoApprovalId,
                                                type: "button",
                                                style: {
                                                    color: 'var(--red-primary)',
                                                    borderColor: 'var(--red-primary)'
                                                },
                                                children: "Rechazar (NO)"
                                            }, void 0, false, {
                                                fileName: "[project]/app/pruebas/page.tsx",
                                                lineNumber: 311,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 284,
                                        columnNumber: 13
                                    }, this),
                                    renderCardResult('s5_esc'),
                                    renderCardResult('s5_app'),
                                    renderCardResult('s5_rej')
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/pruebas/page.tsx",
                                lineNumber: 277,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "panel-card",
                                style: {
                                    padding: '1.25rem'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            marginBottom: '0.5rem',
                                            color: 'var(--blue-primary)'
                                        },
                                        children: "6. Flujo de Subida de Adjuntos en 3 Pasos (/v1/uploads)"
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 328,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: '0.8rem'
                                        },
                                        children: "Ejecuta el ciclo de 3 pasos: 1) Solicitud de autorización, 2) Carga de bytes binary, 3) Marcado como ready."
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 331,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '0.6rem',
                                            alignItems: 'center'
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "btn-primary",
                                            onClick: ()=>{
                                                const dummyFile = new File([
                                                    '123456789012'
                                                ], 'recibo_test.png', {
                                                    type: 'image/png'
                                                });
                                                runTest('s6_up', 'Flujo de Adjunto 3 Pasos', ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backend$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["uploadAttachment"])(dummyFile, 'image'));
                                            },
                                            type: "button",
                                            children: "Subir Adjunto Imagen Sintético (12 bytes)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/pruebas/page.tsx",
                                            lineNumber: 335,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/pruebas/page.tsx",
                                        lineNumber: 334,
                                        columnNumber: 13
                                    }, this),
                                    renderCardResult('s6_up')
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/pruebas/page.tsx",
                                lineNumber: 327,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/pruebas/page.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/pruebas/page.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/pruebas/page.tsx",
        lineNumber: 107,
        columnNumber: 5
    }, this);
}
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
}),
];

//# sourceMappingURL=_0lvrv6o._.js.map