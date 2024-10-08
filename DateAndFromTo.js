// ==UserScript==
// @name        Zeiterfassung Tweaks
// @namespace   Violentmonkey Scripts
// @match       https://zeiterfassung.aracom.de/stundenerfassung*
// @grant       none
// @version     1.1
// @author      DennisOstertag
// @description Verändert den Kalenderbutton für ein intuitives Verständnis des gerade ausgewählten Datums.
// ==/UserScript==

(function(){
  'use strict';

  // CONSTANTS
  const shortDaysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const fullDaysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const oneDay = 86400000;

  // VARIABLES
  var stdTag, stdTagObserver, stdTagBtn;

  const _init = function() {
    stdTag = document.getElementById("std-tag");
    stdTagBtn = document.getElementById("std-tag-btn");
    // input[type="hidden"] doesn't fire "change" or "input" event;
    // use MutationObserver to detect value change
    stdTagObserver = new MutationObserver(onStdTagChanged);
    stdTagObserver.observe(stdTag, { attributes: true });
    onSelectedDayChanged();
    injectStyle();

    // ("save" navigates to the same page with different query params => call on init)
     updateStartDate();

  };

const updateStartDate = function() {
      const insertFrom = document.getElementById("insert-von");
      const insertUntil = document.getElementById("insert-bis");
      // set value of intertUntil as value of insertFrom input
      insertFrom.value = insertUntil.value;
      insertUntil.value = "";
      insertUntil.focus();
  }

  // Causes green borders to appear for today's calendar field
  const injectStyle = function() {
    const css = document.createElement("style");
    css.type = "text/css";
    css.appendChild(document.createTextNode("\
.ui-datepicker-calendar td.ui-datepicker-today { \
  background: #62882f;\
}\
.ui-datepicker-calendar td.ui-datepicker-today a:not(.ui-btn-active) {\
  padding: .4em .5em;\
  margin: auto;\
}"));
    document.getElementsByTagName("head")[0].appendChild(css);
  }

  const onStdTagChanged = function(mutations, observer) {
    if (mutations[0].attributeName == "value") {
      onSelectedDayChanged();
    }
  };

  const onSelectedDayChanged = function() {
    const dateParts = stdTag.value.split('.');
    const selectedDate = new Date(Date.UTC(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), 0, 0, 0, 0));
    const nowDate = new Date();
    const todayDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0));

    const selected = selectedDate.getTime();
    const today = todayDate.getTime();

    const selectedDoW = (selectedDate.getDay() + 6) % 7;
    const todayDoW = (todayDate.getDay() + 6) % 7;
    // Days of week are shifted from Su-Sa to Mo-Su
    // to accomodate for German first day of week.
    // This makes it easier to determine if two
    // dates are in the same week.

    const diff = selected - today;

    stdTagBtn.classList.remove("ui-btn-f", "ui-btn-g", "ui-btn-b");
    if (selected === today) {
      stdTagBtn.classList.add("ui-btn-g");
    } else if (selected < today) {
      stdTagBtn.classList.add("ui-btn-f");
    } else {
      stdTagBtn.classList.add("ui-btn-b");
    }

    let inWords = "";
    if (diff < -oneDay && diff >= -7 * oneDay) {
      if (selectedDoW < todayDoW) {
        inWords = fullDaysOfWeek[selectedDoW] + " (";
      } else {
        inWords = "lz. " + fullDaysOfWeek[selectedDoW] + " (";
      }
    } else if (diff > oneDay && diff <= 7 * oneDay) {
      if (selectedDoW > todayDoW) {
        inWords = fullDaysOfWeek[selectedDoW] + " (";
      } else {
        inWords = "nä. " + fullDaysOfWeek[selectedDoW] + " (";
      }
    } else {
      switch (diff) {
        case -oneDay:
          inWords = "Gestern";
          break;
        case 0:
          inWords = "Heute";
          break;
        case oneDay:
          inWords = "Morgen";
          break;
      }
      if (inWords !== "") {
        inWords += ", " + fullDaysOfWeek[selectedDoW] + " (";
      }
    }

    if (inWords === "") {
      stdTagBtn.textContent = shortDaysOfWeek[selectedDoW] + "., " + stdTag.value;
    } else {
      const dateStr = selectedDate.getDate().toString().padStart(2, '0');
      const monthStr = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      stdTagBtn.textContent = inWords + dateStr + "." + monthStr + ".)";
    }
  };

  _init();
}).bind(null)();
