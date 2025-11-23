// injected.js - 运行在网页主世界，拥有调用 submitHomework 的权限

(function() {
    console.log("【助手内核】已注入主页面，监听指令中...");

    // 1. 定义解锁函数
    function doUnlock() {
        console.log("【助手内核】执行解锁...");
        try {
            // 开启设计模式
            document.designMode = 'on';
            
            // 暴力覆盖事件监听
            const kill = (e) => {
                e.stopImmediatePropagation();
                e.stopPropagation();
            };
            
            ['copy', 'cut', 'paste', 'selectstart', 'contextmenu'].forEach(evt => {
                window.addEventListener(evt, kill, true);
                document.addEventListener(evt, kill, true);
            });

            // 清理传统属性
            document.oncopy = null;
            document.onpaste = null;
            document.oncontextmenu = null;
            document.body.oncopy = null;
            
            alert("✅ 复制粘贴限制已解除！");
        } catch (e) {
            console.error(e);
        }
    }

    // 2. 定义提交函数
    function doSubmit() {
        console.log("【助手内核】执行提交...");
        try {
            if (typeof window.submitHomework === 'function') {
                window.submitHomework();
            } else if (typeof submitHomework === 'function') {
                submitHomework();
            } else {
                alert("❌ 错误：当前页面未找到 submitHomework 函数。\n请确认您是在【做题页面】点击的提交。");
            }
        } catch (e) {
            alert("提交异常: " + e.message);
        }
    }

    // 3. 监听来自 content.js 的消息
    // 这是绕过 CSP 的关键：content.js 发消息，这里接消息并执行
    window.addEventListener("message", function(event) {
        // 安全校验，只接收来自插件的消息
        if (event.data && event.data.source === "MY_CHROME_EXTENSION") {
            if (event.data.action === "SUBMIT") {
                doSubmit();
            }
            if (event.data.action === "UNLOCK") {
                doUnlock();
            }
        }
    }, false);

})();