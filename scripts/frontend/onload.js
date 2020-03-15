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
  let loadingModal = document.getElementById('loading');
  if (event.target.readyState === "loading") {   
    if(loadingModal) { loadingModal.style.display = 'block'; }
  }
  if (event.target.readyState === "interactive") {   
    if(loadingModal) { loadingModal.style.display = 'block'; }
  }
  if (event.target.readyState === "complete") {
    // console.log('inside readyState === "complete"', loadingModal);
    if(loadingModal) { loadingModal.style.display = 'none'; }
  }
});