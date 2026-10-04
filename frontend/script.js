document.addEventListener('DOMContentLoaded', () => {
    const topicInput = document.getElementById('topic-input');
    const submitBtn = document.getElementById('submit-btn');
    const levelBtns = document.querySelectorAll('.level-btn');

    const emptyState = document.getElementById('empty-state');
    const explanationContainer = document.getElementById('explanation-container');
    const resultText = document.getElementById('result-text');
    const explanationLevelText = document.getElementById('explanation-level-text');
    const copyBtn = document.getElementById('copy-btn');

    const keywordList = document.getElementById('keyword-list');
    const sentimentBadge = document.getElementById('sentiment-badge');
    const entityList = document.getElementById('entity-list');
    const nlpMetadata = document.getElementById('nlp-metadata');

    const historyDrawer = document.getElementById('history-drawer');
    const historyOverlay = document.getElementById('history-overlay');
    const openHistoryBtn = document.getElementById('open-history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');
    const emptyHistoryMsg = document.getElementById('empty-history-msg');

    let currentLevel = 'Age 5';
    let isSubmitting = false;

    const loadHistory = () => JSON.parse(localStorage.getItem('eli5_history') || '[]');

    const saveToHistory = (item) => {
        let history = loadHistory();
        history.unshift(item);
        if (history.length > 10) history = history.slice(0, 10);
        localStorage.setItem('eli5_history', JSON.stringify(history));
        renderHistory();
    };

    levelBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            levelBtns.forEach(b => {
                b.classList.remove('active-level');
                b.classList.add('text-on-surface-variant', 'hover:bg-surface-container');
            });
            e.target.classList.add('active-level');
            e.target.classList.remove('text-on-surface-variant', 'hover:bg-surface-container');
            currentLevel = e.target.dataset.level;
        });
    });

    const toggleHistory = () => {
        if (historyDrawer.classList.contains('translate-x-full')) {
            historyDrawer.classList.remove('translate-x-full');
            historyOverlay.classList.remove('hidden');
            setTimeout(() => historyOverlay.style.opacity = '1', 10);
            renderHistory();
        } else {
            historyDrawer.classList.add('translate-x-full');
            historyOverlay.style.opacity = '0';
            setTimeout(() => historyOverlay.classList.add('hidden'), 300);
        }
    };

    openHistoryBtn.addEventListener('click', toggleHistory);
    closeHistoryBtn.addEventListener('click', toggleHistory);
    historyOverlay.addEventListener('click', toggleHistory);

    const renderHistory = () => {
        const history = loadHistory();
        historyList.innerHTML = '';

        if (history.length === 0) {
            emptyHistoryMsg.style.display = 'block';
            historyList.appendChild(emptyHistoryMsg);
            return;
        }

        history.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'bg-surface p-4 rounded-lg cursor-pointer hover:bg-surface-container-low transition border border-surface-container group';
            div.innerHTML = `
                <div class="text-xs font-bold text-primary mb-1 uppercase tracking-wider">${entry.level}</div>
                <div class="font-bold text-on-surface line-clamp-2">${entry.topic}</div>
                <div class="text-xs text-on-surface-variant mt-2">${entry.timestamp || ''}</div>
            `;
            div.addEventListener('click', () => {
                topicInput.value = entry.topic;
                showExplanation(entry.explanation, entry.level, {
                    keywords: entry.keywords || [],
                    sentiment: entry.sentiment || 'Neutral',
                    entities: entry.entities || []
                });
                toggleHistory();
            });
            historyList.appendChild(div);
        });
    };

    const setBtnLoading = (loading) => {
        isSubmitting = loading;
        if (loading) {
            submitBtn.innerHTML = `
                <span class="material-symbols-outlined animate-spin" style="font-variation-settings: 'FILL' 1;">sync</span>
                <span>Brainsplaining...</span>
            `;
            submitBtn.classList.add('opacity-80', 'cursor-not-allowed', 'scale-[0.98]');
        } else {
            submitBtn.innerHTML = `
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">psychology</span>
                <span>Brainsplain It!</span>
            `;
            submitBtn.classList.remove('opacity-80', 'cursor-not-allowed', 'scale-[0.98]');
        }
    };

    const renderNlpInsights = (insights = null) => {
        if (!nlpMetadata || !keywordList || !sentimentBadge || !entityList) {
            console.warn('NLP metadata elements not found in DOM');
            return;
        }

        const keywords = insights?.keywords || [];
        const entities = insights?.entities || [];
        const sentiment = insights?.sentiment || 'Neutral';

        keywordList.innerHTML = keywords.length
            ? keywords.map(word => `<span class="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-bold">${word}</span>`).join('')
            : '<span class="text-xs text-on-surface-variant">No keywords found</span>';

        const sentimentColor = sentiment === 'Positive'
            ? 'bg-emerald-100 text-emerald-700'
            : sentiment === 'Negative'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700';

        sentimentBadge.className = `inline-flex rounded-full px-3 py-1 text-xs font-bold ${sentimentColor}`;
        sentimentBadge.textContent = sentiment;

        entityList.innerHTML = entities.length
            ? entities.map(entity => `<span class="bg-surface-container px-2 py-1 rounded-full text-xs font-bold text-on-surface">${entity}</span>`).join('')
            : '<span class="text-xs text-on-surface-variant">No named entities found</span>';

        nlpMetadata.classList.remove('hidden');
    };

    const showExplanation = (text, level, insights = null) => {
        emptyState.classList.add('hidden');
        explanationContainer.classList.remove('hidden');

        explanationContainer.classList.remove('animate-fade-in');
        void explanationContainer.offsetWidth;
        explanationContainer.classList.add('animate-fade-in');

        resultText.textContent = text;
        explanationLevelText.textContent = level;
        renderNlpInsights(insights);
    };

    const showError = (msg) => {
        emptyState.classList.add('hidden');
        explanationContainer.classList.remove('hidden');
        resultText.innerHTML = `<span class="text-error font-bold">${msg}</span>`;
        explanationLevelText.textContent = 'Error';
        nlpMetadata.classList.add('hidden');
    };

    submitBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        if (!topic || isSubmitting) return;

        setBtnLoading(true);

        try {
            const res = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, level: currentLevel })
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || 'Something went wrong.');
                return;
            }

            showExplanation(data.explanation, currentLevel, {
                keywords: data.keywords || [],
                sentiment: data.sentiment || 'Neutral',
                entities: data.entities || []
            });

            saveToHistory({
                topic,
                level: currentLevel,
                explanation: data.explanation,
                keywords: data.keywords || [],
                sentiment: data.sentiment || 'Neutral',
                entities: data.entities || [],
                timestamp: new Date().toLocaleDateString()
            });
        } catch (error) {
            console.error('Fetch error:', error);
            showError('Could not connect to the Brainsplain server. Is it running?');
        } finally {
            setBtnLoading(false);
        }
    });

    copyBtn.addEventListener('click', () => {
        const text = resultText.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">check</span> Copied!`;
            setTimeout(() => copyBtn.innerHTML = originalHTML, 2000);
        });
    });

    renderHistory();
});
