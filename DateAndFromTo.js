// ==UserScript==
// @name        Zeiterfassung Tweaks
// @namespace   Violentmonkey Scripts
// @match       https://zeiterfassung.aracom.de/stundenerfassung*
// @grant       none
// @version     1.2
// @author      DennisOstertag
// @description 
// - Verändert den Kalenderbutton für ein intuitives Verständnis des gerade ausgewählten Datums. 
// - Fügt automatisiert das Startdatum aus, und markiert Zeilen, welche "TODO" enthalten.
// - Berechnet für jeden Tag die Summe der eingetragenen Stunden und zeigt diese im Header an. 
// - Hightlight Projekte auf die nicht gebucht werden soll in rot
// ==/UserScript==

(function(){
  'use strict';

  // CONSTANTS
  const shortDaysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const fullDaysOfWeek = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const oneDay = 86400000;
  // config for todo highlighting
  const todoHightlightColor = "lightyellow";
  // keyword must be all lowercase!
  const highlightKeyword = "todo";
  // config for incorrect projects
  const incorrectProjectHightlightColor = "#de5458";
  // array of all unique values that are included in not allowed/incorrect projects
  const incorrectProjectKeywords = Array();

  // class where the table containing the bookings starts
  const bookingTableId = "std-buchungen-body";
  // duration element class in table
  const duractionClass = ".td-dauer";
  const durationValueClass = ".val-show";

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

     // "save" navigates to the same page with different query params => call on init
     updateStartDate();

     // call highlight functions in order of precendence, starting with the lowest
     highlightTodoComments();
     highlightIncorrectProjects();
     calculateDailyWorkingHours();
  };

  const calculateDailyWorkingHours = function(){
    function calculateDuration(elements){
      let currentDuration = 0.00;
       for(const child of elements){
              const durationElement = child.querySelector(duractionClass);
              if(!durationElement){
                  return;
              }

              const durationValueElement = durationElement.querySelector(durationValueClass);
              if(!durationValueElement){
                return;
              }

              const floatString = durationValueElement.innerText.replace(",",".");
              const floatValue = parseFloat(floatString);
              currentDuration += floatValue;
          }

      return currentDuration;
    }

    function createDurationElement(header,duration){
      const element = document.createElement("span");
      element.style = "font-weight:bold;width:35px;line-height: unset;";
      element.innerText = " \u00A0\u00A0 " + duration + " Std"

      header.children[0].appendChild(element);
    }

    const table = document.getElementById(bookingTableId);

    let header;
    let children = [];
    let duration = 0.00;
    for(const row of table.children){
      // header element of days has no id
      if(row.id == "" ){
        if(children.length != 0){
          duration = calculateDuration(children);

          createDurationElement(header,duration);
        }

        header = row;
        children = [];

      }
      else{
        children.push(row);
      }
    }

    duration = calculateDuration(children, duration);
    createDurationElement(header,duration);
  }

  const highlightTodoComments = function(keyword) {
      // get all comments (div elements)
      const commentNodes = Array(...document.getElementsByClassName("readmore-text"));

      const todoNodes = commentNodes.filter(node => node.innerText?.toLowerCase().includes(highlightKeyword))

      for(let node of todoNodes) {
          findAndHighlightContainingTableRow(node, todoHightlightColor);
      }
  }

  const highlightIncorrectProjects = function() {
      // get all projects (div elements)
      const projectNodes = Array(...document.querySelectorAll(".td-projekt>.val-show"));
      // Filter for incorrect projects
      const incorrectProjectNodes = projectNodes.filter(node => incorrectProjectKeywords.some(keyword => node?.innerText?.includes(keyword)));
      for(let node of incorrectProjectNodes) {
          findAndHighlightContainingTableRow(node, incorrectProjectHightlightColor);
      }
  }

  const findAndHighlightContainingTableRow = function(node, color) {
      let todoTds = [];
      // get tr
      const tr =(node.closest("tr"));
      // get all columns in table row
      todoTds.push(...tr.children)

      // override the background-color of all columns
      for(let todoTd of todoTds) {
          todoTd.style.backgroundColor = color;
      }
  }

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
})();