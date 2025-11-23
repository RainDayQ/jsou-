(function() {
    // 避免在极小iframe加载
    if (window.innerWidth < 300) return;

    console.log("【插件前端】加载中...");

    // ===========================================
    // 1. 注入内核脚本 (injected.js)
    // 这是绕过 CSP 的唯一正规途径
    // ===========================================
    function injectScript() {
        try {
            const script = document.createElement('script');
            // 获取插件目录下的 injected.js 路径
            script.src = chrome.runtime.getURL('injected.js');
            script.onload = function() {
                this.remove(); // 加载完移除标签，保持整洁
                console.log("【插件前端】内核脚本注入成功！");
            };
            (document.head || document.documentElement).appendChild(script);
        } catch (e) {
            console.error("注入失败:", e);
        }
    }
    // 立即执行注入
    injectScript();

    // ===========================================
    // 2. 基础答题逻辑 (保持不变)
    // ===========================================
    function normalizeText(text) {
        if (!text) return "";
        text = text.replace(/^\d+[、.]\s*/, '').trim().replace(/\s+/g, '').replace(/（/g, '(').replace(/）/g, ')').toLowerCase();
        return text;
    }
    const answerKey = {};
    function initBank() {
        if (window.QUESTION_BANK) {
            window.QUESTION_BANK.forEach(item => {
                const q = normalizeText(item.question);
                let a = item.answer;
                if (a.includes('；')) a = a.split('；').map(i => normalizeText(i));
                else if (a.includes(';')) a = a.split(';').map(i => normalizeText(i));
                else a = normalizeText(a);
                if (q) answerKey[q] = a;
            });
        }
    }

    async function startAnswering() {
        const questions = document.querySelectorAll("div.insert[data-qtype]");
        if(questions.length === 0) {
            alert("当前区域未检测到题目，请尝试点击页面其他位置的插件面板。");
            return;
        }
        let count = 0;
        for (let i = 0; i < questions.length; i++) {
            const qDiv = questions[i];
            let qTextEl = qDiv.querySelector("div.window-title") || qDiv.querySelector("div.questionTitle");
            let qTextRaw = qTextEl ? qTextEl.innerText : "";
            let qNormalized = normalizeText(qTextRaw);
            if (!qNormalized) continue;
            
            // 简单匹配
            let correctAns = answerKey[qNormalized];
            if (correctAns) {
                const targetAnswers = Array.isArray(correctAns) ? correctAns : [correctAns];
                const options = qDiv.querySelectorAll("li.option-title");
                for (let opt of options) {
                    let optTextEl = opt.querySelector("div[style*='display: inline-block']"); 
                    let optTextRaw = optTextEl ? optTextEl.innerText : "";
                    if (targetAnswers.includes(normalizeText(optTextRaw))) {
                        const clickArea = opt.querySelector("div.numberCover");
                        if (clickArea) { clickArea.click(); count++; }
                    }
                }
            }
            await new Promise(r => setTimeout(r, 20)); 
        }
        alert(`答题结束，共 ${count} 题。`);
    }

    // ===========================================
    // 3. 通信逻辑
    // ===========================================
    function sendCommand(actionName) {
        // 向 window 发送消息，injected.js 会接收到
        window.postMessage({
            source: "MY_CHROME_EXTENSION",
            action: actionName
        }, "*");
    }

    // ===========================================
    // 4. UI 面板
    // ===========================================
    function createUI() {
        if (document.getElementById('my-helper-panel')) return;
        
        const isIframe = window.self !== window.top;
        const panel = document.createElement("div");
        panel.id = 'my-helper-panel';
        panel.style.cssText = `
            position: fixed; top: ${isIframe ? '60px' : '120px'}; right: 20px; z-index: 2147483647;
            display: flex; flex-direction: column; gap: 8px; padding: 10px;
            background-color: #333; border-radius: 6px; color: white;
            font-family: sans-serif; width: 140px; box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;
        
        const title = document.createElement("div");
        title.innerText = isIframe ? "助手 (子窗口)" : "助手 (主窗口)";
        title.style.textAlign = "center";
        title.style.fontSize = "12px";
        title.style.color = isIframe ? "#00cec9" : "#fab1a0";

        const btnStyle = "padding:6px; cursor:pointer; border:none; border-radius:3px; color:#fff; font-weight:bold;";

        const btnUnlock = document.createElement("button");
        btnUnlock.innerText = "🔓 解除限制";
        btnUnlock.style.cssText = btnStyle + "background-color: #e17055;";
        btnUnlock.onclick = () => {
            // CSS 注入依然在 content.js 做
            const style = document.createElement('style');
            style.innerHTML = `* { -webkit-user-select: text !important; user-select: text !important; pointer-events: auto !important; } .layui-layer-shade { display: none !important; }`;
            document.head.appendChild(style);
            // JS 解锁发送给内核
            sendCommand("UNLOCK"); 
            btnUnlock.style.backgroundColor = "#00b894";
        };

        const btnAnswer = document.createElement("button");
        btnAnswer.innerText = "📝 自动答题";
        btnAnswer.style.cssText = btnStyle + "background-color: #0984e3;";
        btnAnswer.onclick = () => startAnswering();

        const btnSubmit = document.createElement("button");
        btnSubmit.innerText = "🚀 提交作业";
        btnSubmit.style.cssText = btnStyle + "background-color: #d63031;";
        btnSubmit.onclick = () => {
            if(confirm("确定提交吗？")) {
                sendCommand("SUBMIT");
            }
        };

        panel.appendChild(title);
        panel.appendChild(btnUnlock);
        panel.appendChild(btnAnswer);
        panel.appendChild(btnSubmit);
        document.body.appendChild(panel);
    }

    setTimeout(() => {
        initBank();
        createUI();
    }, 1000);

})();