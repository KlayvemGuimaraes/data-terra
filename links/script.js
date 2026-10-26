(function () {
  "use strict";

  const translations = {
    en: {
      title: "DataTerra — Project links",
      description: "Meet DataTerra: territorial intelligence for data centers in Brazil. Explore the simulator, discover the project, and understand our methodology.",
      skip: "Skip to project links",
      brandLabel: "DataTerra website",
      languageLabel: "Page language",
      eyebrow: "Built around the territory",
      headlineFirst: "Better decisions.",
      headlineSecond: "A clearer starting point.",
      lead: "Territorial intelligence for data centers in Brazil.",
      intro: "We bring water, energy, connectivity and territorial context together to help teams decide where to investigate next.",
      imageAlt: "Conceptual illustration of a data center connected to water, landscape and energy infrastructure",
      imageLabel: "Understand the place. Then plan the project.",
      pillarsLabel: "Four assessment pillars",
      water: "Water stress",
      energy: "Energy capacity",
      connectivity: "Connectivity",
      territory: "Social & territorial risk",
      linksEyebrow: "Start exploring",
      linksHeading: "One project. Your next step.",
      linksNavigation: "Main project links",
      simulatorTag: "Interactive map",
      simulatorTitle: "Explore the simulator",
      simulatorText: "Start a territorial analysis.",
      websiteTitle: "Meet DataTerra",
      websiteText: "Our purpose and how it works.",
      methodTitle: "How we calculate",
      methodText: "Sources, assumptions & methodology.",
      methodFormat: "PDF · English",
      instagramTitle: "Follow our journey",
      scope: "A starting point for preliminary screening. Detailed feasibility and licensing require specialist studies.",
      footer: "Good decisions start with the territory.",
      brazil: "Brazil"
    },
    pt: {
      title: "DataTerra — Links do projeto",
      description: "Conheça o DataTerra: inteligência territorial para data centers no Brasil. Explore o simulador, descubra o projeto e entenda a metodologia.",
      skip: "Ir para os links do projeto",
      brandLabel: "Site do DataTerra",
      languageLabel: "Idioma da página",
      eyebrow: "O território como ponto de partida",
      headlineFirst: "Melhores decisões.",
      headlineSecond: "Um começo mais claro.",
      lead: "Inteligência territorial para data centers no Brasil.",
      intro: "Reunimos água, energia, conectividade e contexto territorial para ajudar equipes a decidir onde aprofundar seus estudos.",
      imageAlt: "Ilustração conceitual de um data center conectado à água, ao território e à infraestrutura energética",
      imageLabel: "Entenda o lugar. Depois, planeje o projeto.",
      pillarsLabel: "Quatro pilares de avaliação",
      water: "Estresse hídrico",
      energy: "Capacidade energética",
      connectivity: "Conectividade",
      territory: "Risco social e territorial",
      linksEyebrow: "Comece por aqui",
      linksHeading: "Um projeto. Seu próximo passo.",
      linksNavigation: "Principais links do projeto",
      simulatorTag: "Mapa interativo",
      simulatorTitle: "Explorar o simulador",
      simulatorText: "Comece uma análise territorial.",
      websiteTitle: "Conheça o DataTerra",
      websiteText: "Nosso propósito e como funciona.",
      methodTitle: "Como calculamos",
      methodText: "Fontes, premissas e metodologia.",
      methodFormat: "PDF · Em inglês",
      instagramTitle: "Acompanhe nossa jornada",
      scope: "Um ponto de partida para a triagem preliminar. Viabilidade detalhada e licenciamento exigem estudos especializados.",
      footer: "Boas decisões começam pelo território.",
      brazil: "Brasil"
    }
  };

  function applyLanguage(language, updateUrl) {
    const selected = language === "pt" || language === "pt-BR" ? "pt" : "en";
    const copy = translations[selected];
    document.documentElement.lang = selected === "pt" ? "pt-BR" : "en";
    document.title = copy.title;
    document.querySelector('meta[name="description"]').content = copy.description;
    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      element.textContent = copy[element.dataset.i18n];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (element) {
      element.setAttribute("aria-label", copy[element.dataset.i18nAria]);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (element) {
      element.alt = copy[element.dataset.i18nAlt];
    });
    document.querySelectorAll("[data-language]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.language === selected));
    });
    document.querySelectorAll("[data-language-link]").forEach(function (link) {
      const url = new URL(link.href);
      url.searchParams.set("lang", selected);
      link.href = url.toString();
    });
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", selected);
      window.history.replaceState(null, "", url);
    }
  }

  document.querySelectorAll("[data-language]").forEach(function (button) {
    button.addEventListener("click", function () {
      applyLanguage(button.dataset.language, true);
    });
  });
  applyLanguage(new URLSearchParams(window.location.search).get("lang"), false);
}());
