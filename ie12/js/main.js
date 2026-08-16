(function () {
    "use strict";

    var urlBox, backButton, forwardButton, refreshButton;
    var webviewsContainer, tabsRow, addTabButton;
    var tabs = [];
    var activeTabId = null;
    var tabCounter = 0;

    function getActiveWebview() {
        var activeTab = tabs.find(t => t.id === activeTabId);
        return activeTab ? activeTab.webview : null;
    }

    function navigateTo(url) {
        if (!url) return;
        var wv = getActiveWebview();
        if (!wv) return;

        if (url.indexOf("://") === -1 && url.match(/\./)) {
            url = "http://" + url;
        }
        wv.navigate(url);

        if (urlBox && urlBox._inputElement) {
            urlBox._inputElement.blur();
        }

        wv.focus();
    }

    function updateNavButtons() {
        var wv = getActiveWebview();
        if (!wv) {
            backButton.disabled = true;
            forwardButton.disabled = true;
            return;
        }
        backButton.disabled = !wv.canGoBack;
        forwardButton.disabled = !wv.canGoForward;
    }

    function switchTab(id) {
        activeTabId = id;

        tabs.forEach(function (t) {
            if (t.id === id) {
                t.webview.classList.add("active");
                t.button.classList.add("active");

                if (urlBox) {
                    var newTabPath = "ms-appx-web://microsoft.ie.12/newtab/index.html";
                    var currentUrl = t.webview.src || "";
                    var displayUrl = (currentUrl.toLowerCase() === newTabPath.toLowerCase()) ? "" : currentUrl;

                    urlBox.text = displayUrl;
                    urlBox._inputElement.value = displayUrl;
                }
            } else {
                t.webview.classList.remove("active");
                t.button.classList.remove("active");
            }
        });

        updateNavButtons();
    }

    function closeTab(id) {
        var index = tabs.findIndex(t => t.id === id);
        if (index === -1) return;
        var t = tabs[index];

        t.button.classList.add("removing");

        setTimeout(function () {
            if (t.webview.parentNode) t.webview.parentNode.removeChild(t.webview);
            if (t.button.parentNode) t.button.parentNode.removeChild(t.button);

            tabs.splice(index, 1);

            if (tabs.length === 0) {
                window.close();
            } else if (activeTabId === id) {
                var nextIndex = index > 0 ? index - 1 : 0;
                switchTab(tabs[nextIndex].id);
            }
        }, 250);
    }

    function createTab(url) {
        tabCounter++;
        var id = "tab_" + tabCounter;

        var wv = document.createElement("x-ms-webview");
        wv.className = "webview-instance";
        wv.id = id + "_wv";
        webviewsContainer.appendChild(wv);

        var tabBtn = document.createElement("button");
        tabBtn.className = "tab-button";
        tabBtn.id = id + "_btn";

        var titleSpan = document.createElement("span");
        titleSpan.className = "tab-title";
        titleSpan.textContent = WinJS.Resources.getString("newTab").value;

        var closeBtn = document.createElement("button");
        closeBtn.className = "tab-close";
        closeBtn.title = "Close Tab";
        closeBtn.innerHTML = "&#xE8BB;";

        tabBtn.appendChild(titleSpan);
        tabBtn.appendChild(closeBtn);

        tabsRow.insertBefore(tabBtn, addTabButton);
        tabsRow.scrollLeft = tabsRow.scrollWidth;

        var tabObj = { id: id, webview: wv, button: tabBtn, titleSpan: titleSpan };
        tabs.push(tabObj);

        tabBtn.addEventListener("click", function (e) {
            if (e.target === closeBtn || closeBtn.contains(e.target)) {
                closeTab(id);
            } else {
                switchTab(id);
            }
        });

        wv.addEventListener("MSWebViewNewWindowRequested", function (e) {
            e.preventDefault();
            var url = e.uri;
            var openInNewOSWindow = false;

            if (openInNewOSWindow) {
                var newView = Windows.ApplicationModel.Core.CoreApplication.createNewView();
                newView.dispatcher.runAsync(Windows.UI.Core.CoreDispatcherPriority.normal, function () {
                    var newWindow = window.open("index.html?url=" + encodeURIComponent(url));
                });
            } else {
                createTab(url);
            }
        });

        wv.addEventListener("MSWebViewNavigationStarting", function () {
            if (activeTabId === id) updateNavButtons();
        });

        wv.addEventListener("MSWebViewNavigationCompleted", function (e) {
            if (e.uri) {
                var newTabPath = "ms-appx-web://microsoft.ie.12/newtab/index.html";
                var isNewTab = (e.uri.toLowerCase() === newTabPath.toLowerCase() || e.uri.indexOf("newtab/index.html") !== -1);

                if (isNewTab) {
                    var translations = {
                        greetings: WinJS.Resources.getString("greetings").value || "Welcome back!",
                        placeholder: WinJS.Resources.getString("searchPlaceholder").value || "Search..."
                    };

                    setTimeout(function () {
                        var op = wv.invokeScriptAsync("receiveTranslations", JSON.stringify(translations));
                        op.start();
                    }, 150);
                }

                if (activeTabId === id) {
                    var displayUrl = isNewTab ? "" : e.uri;
                    urlBox.text = displayUrl;
                    urlBox._inputElement.value = displayUrl;
                    updateNavButtons();
                }

                if (isNewTab) {
                    titleSpan.textContent = WinJS.Resources.getString("newTab").value;
                } else if (wv.documentTitle && wv.documentTitle.trim() !== "") {
                    titleSpan.textContent = wv.documentTitle;
                } else {
                    var domain = e.uri.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                    titleSpan.textContent = domain || WinJS.Resources.getString("loading").value;
                }
            }
        });

        wv.addEventListener("MSWebViewContainsFullScreenElementChanged", function () {
            var view = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
            if (wv.containsFullScreenElement) {
                view.tryEnterFullScreenMode();
                document.body.classList.add("fullscreen");
            } else {
                view.exitFullScreenMode();
                document.body.classList.remove("fullscreen");
            }
        });

        if (url) {
            wv.navigate(url);
        }
        switchTab(id);
    }

    function init() {
        webviewsContainer = document.getElementById("webviewsContainer");
        tabsRow = document.getElementById("tabsRow");
        addTabButton = document.getElementById("addTabButton");

        urlBox = document.getElementById("urlBox").winControl;
        backButton = document.getElementById("backButton");
        forwardButton = document.getElementById("forwardButton");
        refreshButton = document.getElementById("refreshButton");

        addTabButton.addEventListener("click", function () {
            createTab("ms-appx-web:///newtab/index.html");
        });

        urlBox.addEventListener("querysubmitted", function (e) {
            var q = e.detail.queryText.trim();
            if (q.match(/^https?:\/\//i) || q.match(/\./)) {
                navigateTo(q);
            } else {
                navigateTo("https://www.bing.com/search?q=" + encodeURIComponent(q));
            }
        });

        urlBox.addEventListener("suggestionsrequested", function (e) {
            var query = e.detail.queryText.trim();
            var suggestionCollection = e.detail.searchSuggestionCollection;
            if (!query) return;

            var url = "https://api.bing.com/osjson.aspx?query=" + encodeURIComponent(query);

            e.detail.setPromise(
                WinJS.xhr({ url: url }).then(function (result) {
                    var data = JSON.parse(result.responseText);
                    var list = data[1];
                    list.forEach(function (item) {
                        suggestionCollection.appendQuerySuggestion(item);
                    });
                })
            );
        });

        backButton.addEventListener("click", function () {
            var wv = getActiveWebview();
            if (wv && wv.canGoBack) wv.goBack();
        });

        forwardButton.addEventListener("click", function () {
            var wv = getActiveWebview();
            if (wv && wv.canGoForward) wv.goForward();
        });

        refreshButton.addEventListener("click", function () {
            var wv = getActiveWebview();
            if (wv) wv.refresh();
        });

        var assistantButton = document.getElementById("assistantButton");
        var assistantPanel = document.getElementById("assistantPanel");

        assistantButton.addEventListener("click", function () {
            var isOpen = assistantPanel.classList.contains("open");
            if (isOpen) {
                assistantPanel.classList.remove("open");
            } else {
                assistantPanel.classList.add("open");
            }
        });

        createTab("ms-appx-web:///newtab/index.html");
    }

    document.addEventListener("DOMContentLoaded", function () {
        WinJS.UI.processAll().then(function () {
            return WinJS.Resources.processAll();
        }).done(init);
    });
})();
