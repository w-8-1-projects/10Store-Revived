(function () {
    "use strict";

    window.receiveTranslations = function (json) {
        try {
            var strings = JSON.parse(json);
            var input = document.getElementById("searchInput");
            if (input && strings.placeholder) {
                input.placeholder = strings.placeholder;
            }

            var greetingHeader = document.getElementById("randomGreeting");
            if (greetingHeader && strings.greetings) {
                var words = strings.greetings.split(";");
                var index = Math.floor(Math.random() * words.length);
                greetingHeader.textContent = words[index];
            }
        } catch (e) {
            console.error("Error parsing translations in WebView", e);
        }
    };

    function doSearch() {
        const query = document.getElementById("searchInput").value.trim();
        if (query) {
            window.location.href = "https://www.bing.com/search?q=" + encodeURIComponent(query);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("searchInput").addEventListener("keypress", function (e) {
            if (e.key === "Enter") doSearch();
        });
        document.getElementById("searchBtn").addEventListener("click", doSearch);
    });
})();