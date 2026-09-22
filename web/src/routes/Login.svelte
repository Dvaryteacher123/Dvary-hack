<script>
    import { onMount, onDestroy } from "svelte";
    import { navigate } from "../lib/router.svelte.js";
    import { token, profile, setSession } from "../lib/api.js";
    import { get } from "svelte/store";

    let phone = $state("");
    let step = $state("form"); // form | success
    let msg = $state(null); // { type, text }
    let loading = $state(false);
    let pairingCode = $state("");

    onMount(async () => {
        const t = get(token);
        if (t) {
            try {
                const r = await fetch("/api/auth/verify", { headers: { Authorization: "Bearer " + t } });
                const d = await r.json();
                if (r.ok && d.admin && d.admin.role !== "groupadmin") {
                    setSession(t, d.admin);
                    navigate("/dashboard");
                }
            } catch {
                /* ignore */
            }
        }
    });

    function show(type, text) {
        msg = { type, text };
    }

    async function submit() {
        const p = phone.trim();
        if (!p) return show("err", "Please enter your WhatsApp number.");
        loading = true;
        msg = null;
        try {
            const r = await fetch("/api/get-pair", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumber: p }),
            });
            const d = await r.json();
            if (!r.ok) {
                show("err", d.message || "Failed to generate pairing code.");
                return;
            }
            if (d.success && d.pairingCode) {
                pairingCode = d.pairingCode;
                step = "success";
                show("ok", "Pairing code generated successfully!");
            } else {
                show("err", d.message || "Unexpected server response.");
            }
        } catch {
            show("err", "Network error. Try again.");
        } finally {
            loading = false;
        }
    }

    function resetForm() {
        step = "form";
        pairingCode = "";
        msg = null;
    }
</script>

<div class="shell">
    <div class="bgglow"></div>
    <div class="card w-full max-w-[440px] p-9 relative z-10">
        <div class="flex flex-col items-center mb-6">
            <div class="logo"><img src="/images/icon.jpg" alt="Dvary" onerror={(e) => e.target.remove()} /><i class="fas fa-robot"></i></div>
            <h1 class="title">DVARY PAIRING</h1>
            <p class="text-[.86rem] text-muted mt-1">Get your WhatsApp pairing code instantly</p>
        </div>

        <div class="divider"></div>

        {#if step === "form"}
            <label class="lbl" for="ph"><i class="fas fa-mobile-screen-button text-indigo"></i> WhatsApp Number</label>
            <input id="ph" class="field" type="tel" placeholder="e.g. 2557xxxxxxxx" autocomplete="tel" bind:value={phone} onkeydown={(e) => e.key === "Enter" && submit()} />
            <button class="btn btn-indigo w-full mt-4" disabled={loading} onclick={submit}>
                {#if loading}<i class="fas fa-spinner spin"></i> Generating Code…{:else}<i class="fas fa-key"></i> Get Pairing Code{/if}
            </button>
            <ul class="hints">
                <li><i class="fas fa-shield-halved"></i><span>Enter your full phone number with country code.</span></li>
                <li><i class="fas fa-bolt"></i><span>Use the code on your WhatsApp Linked Devices menu.</span></li>
            </ul>
        {:else}
            <div class="flex flex-col items-center gap-3 py-2">
                <div class="code-box">
                    <span class="code-text">{pairingCode}</span>
                </div>
                <div class="font-bold text-center">Your Pairing Code is Ready!</div>
                <div class="text-[.8rem] text-muted text-center max-w-[320px] leading-snug">
                    Open WhatsApp on your phone &gt; <b>Linked Devices</b> &gt; <b>Link a Device</b> &gt; <b>Link with phone number instead</b>, then enter this code.
                </div>
                <button class="btn btn-sm mt-3" onclick={resetForm}><i class="fas fa-arrow-left"></i> Generate Another</button>
            </div>
        {/if}

        {#if msg}
            <div class="alert {msg.type}"><i class="fas {msg.type === 'err' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i><span>{msg.text}</span></div>
        {/if}

        <div class="foot">
            <span><span class="dot"></span> Server Online</span>
            <a href="/group-admin" class="link"><i class="fas fa-users-gear"></i> Group Admin</a>
        </div>
    </div>
</div>

<style>
    .shell {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        position: relative;
    }
    .bgglow {
        position: fixed;
        inset: 0;
        z-index: 0;
        background:
            radial-gradient(ellipse 80% 60% at 20% -5%, rgba(99, 102, 241, 0.18), transparent 60%),
            radial-gradient(ellipse 60% 50% at 85% 110%, rgba(139, 92, 246, 0.15), transparent 60%);
    }
    .logo {
        position: relative;
        width: 68px;
        height: 68px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0a1326;
        color: #a5b4fc;
        font-size: 1.6rem;
        border: 2px solid rgba(99, 102, 241, 0.4);
        margin-bottom: 0.9rem;
    }
    .logo img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .title {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #f0f4ff, #c7d2fe);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);
        margin: 1.4rem 0;
    }
    .btn-indigo {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: none;
        color: #fff;
    }
    .btn-indigo:hover:not(:disabled) {
        color: #fff;
        transform: translateY(-1px);
        box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
    }
    .hints {
        list-style: none;
        padding: 0;
        margin: 1.2rem 0 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }
    .hints li {
        display: flex;
        gap: 0.6rem;
        font-size: 0.8rem;
        color: #64748b;
        padding: 0.6rem 0.75rem;
        background: rgba(99, 102, 241, 0.05);
        border: 1px solid rgba(99, 102, 241, 0.1);
        border-radius: 10px;
    }
    .hints li i {
        color: #818cf8;
        margin-top: 2px;
    }
    .alert {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        border-radius: 12px;
        padding: 0.8rem 1rem;
        font-size: 0.85rem;
        margin-top: 1.1rem;
    }
    .alert.err {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.25);
        color: #fca5a5;
    }
    .alert.ok {
        background: rgba(34, 197, 94, 0.08);
        border: 1px solid rgba(34, 197, 94, 0.25);
        color: #86efac;
    }
    .code-box {
        background: rgba(99, 102, 241, 0.08);
        border: 2px dashed rgba(99, 102, 241, 0.4);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        text-align: center;
        width: 100%;
    }
    .code-text {
        font-family: monospace;
        font-size: 1.8rem;
        font-weight: 800;
        letter-spacing: 0.15em;
        color: #a5b4fc;
    }
    .foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 1.4rem;
        font-size: 0.75rem;
        color: #4a5678;
    }
    .foot .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #22c55e;
        display: inline-block;
        margin-right: 5px;
    }
    .link {
        color: var(--color-muted);
        text-decoration: none;
        display: inline-flex;
        gap: 5px;
        align-items: center;
    }
    .link:hover {
        color: #fff;
    }
</style>

