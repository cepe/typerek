// Small, dependency-free UI behaviours that replace the Bootstrap JS we dropped:
//  - mobile navigation toggle
//  - tabs (data-tab / data-panel)
//  - dismissable flash alerts
//
// Written in vanilla JS (no jQuery) so it ports cleanly to a future React frontend.

function initMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]")
  const menu = document.querySelector("[data-nav-menu]")
  if (!toggle || !menu) return

  toggle.addEventListener("click", () => {
    menu.classList.toggle("hidden")
  })
}

function initTabs() {
  const groups = document.querySelectorAll("[data-tabs]")
  groups.forEach((group) => {
    const tabs = group.querySelectorAll("[data-tab]")
    const panels = group.querySelectorAll("[data-panel]")

    const activate = (name) => {
      tabs.forEach((tab) => {
        tab.classList.toggle("tab-active", tab.dataset.tab === name)
      })
      panels.forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.panel !== name)
      })
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault()
        activate(tab.dataset.tab)
      })
    })
  })
}

function initAlerts() {
  document.querySelectorAll("[data-alert]").forEach((alert) => {
    const close = alert.querySelector("[data-alert-close]")
    if (close) close.addEventListener("click", () => alert.remove())
    if (alert.hasAttribute("data-alert-auto")) {
      setTimeout(() => alert.remove(), 6000)
    }
  })
}

function init() {
  initMobileNav()
  initTabs()
  initAlerts()
}

document.addEventListener("DOMContentLoaded", init)
