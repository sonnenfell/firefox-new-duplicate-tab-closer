function isDuplicate(tab, otherTab, settings) {
    const {
        customizeDuplicateDefinition,
        duplicateCheckMethod,
        urlPathSections,
        ignoreCustomSearchStrings,
        customSearchStringKeywords
    } = settings;

    if (!customizeDuplicateDefinition) {
        return tab.url === otherTab.url;
    }

    if (duplicateCheckMethod === 'title') {
        if (tab.title && otherTab.title && tab.title !== "New Tab" && otherTab.title !== "New Tab") {
            return tab.title === otherTab.title;
        }
    }

    // Fallback to URL check if title check is not possible or not selected
    let url1 = tab.url;
    let url2 = otherTab.url;

    if (ignoreCustomSearchStrings && customSearchStringKeywords) {
        const keywords = customSearchStringKeywords.split('\n').map(k => k.trim()).filter(k => k);
        for (const keyword of keywords) {
            if (url1.includes(keyword)) {
                url1 = url1.substring(0, url1.indexOf(keyword));
            }
            if (url2.includes(keyword)) {
                url2 = url2.substring(0, url2.indexOf(keyword));
            }
        }
    }

    const urlObject1 = new URL(url1);
    const urlObject2 = new URL(url2);

    if (urlPathSections === 'domain') {
        return urlObject1.hostname === urlObject2.hostname;
    }

    if (urlPathSections !== 'full') {
        const path1 = urlObject1.pathname.split('/').filter(p => p);
        const path2 = urlObject2.pathname.split('/').filter(p => p);
        const sections1 = path1.slice(0, parseInt(urlPathSections, 10));
        const sections2 = path2.slice(0, parseInt(urlPathSections, 10));

        return urlObject1.hostname === urlObject2.hostname && sections1.join('/') === sections2.join('/');
    }

    return url1 === url2;
}
