"use strict";

/* 03152020 - Gaurav - Added loading gif to show on page load and hide on 
  page load complete 
  
  reference https://www.w3schools.com/jsref/prop_doc_readystate.asp
  One of five values:
  uninitialized - Has not started loading yet
  loading - Is loading
  loaded - Has been loaded
  interactive - Has loaded enough and the user can interact with it
  complete - Fully loaded
*/

document.addEventListener('readystatechange', event => {
  // if ((event.target.readyState === "loading") || (event.target.readyState === "interactive")) {   
  //   loadingImage('SHOW');
  // }
  /* 03152020 - Gaurav - Refactored code to remove showing of loading image on page load. May get 
    irritating for the user since the browser window title already shows it by default. Instead
    added code to hide any loading image, after the page load is complete. The loading image may 
    be shown on any CRUD operation to hold-off the user from interacting with the browser till 
    the operation is completed. */
  if (event.target.readyState === "complete") { loadingImage('HIDE'); }
});

function loadingImage(option) {
  let loadingModal = document.getElementById('loading');
  if(loadingModal) {
    (option === 'SHOW') ? loadingModal.style.display = 'block' : loadingModal.style.display = 'none';
  }
}

function formSubmitted() {
  loadingImage('SHOW');
}