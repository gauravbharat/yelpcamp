var lastComment = "";
var lastCommentId = "";

async function toggleEdit(p_currentElement, p_campId) {
  const delimiter = ":"; //separator for prefix and respective comment id
  const campgroundId = p_campId;

    // prefixes for elements outside the Edit Comment form
  const outerEditButton = "editBtn";
  const editCommentDiv = "editCommentDiv";
  const staticPara = "staticPara";

  // prefixes for dynamic elements inside the Edit Comment form
  const innerEditForm = "edit-comment-form";
  const innerEditCommentInput = "editCommentInput";
  const innerEditUpdateBtn = "editUpdateBtn";
  const innerEditCancelBtn = "editCancelBtn";

  if(p_currentElement) {
    let elementId = p_currentElement.id;

    if(elementId && elementId.length > 0) {
      let delPos = elementId.indexOf(":");
      if (delPos > 0) {
        let elementName = elementId.substr(0, delPos);
        let elementCommentId = elementId.slice(delPos + 1);

        let outerEditButtonId = outerEditButton + delimiter + elementCommentId;
        let editCommentDivId = editCommentDiv + delimiter + elementCommentId;
        let staticParaId = staticPara + delimiter + elementCommentId;

        // if Edit button is pressed
        if(elementName === outerEditButton) {
          // display form border
          document.getElementById(editCommentDivId).className = "shadow-sm border border-warning rounded-sm p-2";
          lastComment = document.getElementById(staticParaId).innerHTML;
          lastCommentId = elementCommentId;

          // disable "visible" or authorized edit and delete buttons to force one update at a time on the page for a user.
          let allEditButtons = document.getElementsByName("outerEditButton")
          for(const editButton of allEditButtons){
            editButton.className = "btn btn-sm btn-warning disabled";
          }
          let allDeleteButtons = document.getElementsByName("outerDeleteButton");
          for(const delButton of allDeleteButtons){
            delButton.className = "btn btn-sm btn-danger";
            delButton.type = "button"
            delButton.disabled = true;
            delButton.style.cursor = "default";
          };

          // dynamic form controls to edit comment, submit or cancel
          document.getElementById(editCommentDivId).innerHTML = await
          `<form id="edit-comment-form:`+ elementCommentId +`" action="/campgrounds/` + campgroundId + `/comments/` + elementCommentId + `?_method=PUT" method="POST"> ` + 
          `<input id="editCommentInput:` + elementCommentId + `" class="form-control" type="text" name="comment[text]" value="` + lastComment + `" required> ` + 
          `<div class="form-group mb-0 mt-2">
              <button id="editUpdateBtn:` + elementCommentId + `" style="display: inline-block;" class="btn btn-sm btn-outline-warning" onclick="toggleEdit(this, '`+ campgroundId + `');" type="button">Update</button>
              <button id="editCancelBtn:` + elementCommentId + `" style="display: inline-block;" class="btn btn-sm btn-outline-warning" onclick="toggleEdit(this, '`+ campgroundId + `');" type="button">Cancel</button>
          </div> ` +     
          ` </form>`;
        } 
        
        // if either update or cancel is pressed from the dynamic form elements
        if((elementName === innerEditCancelBtn) || (elementName === innerEditUpdateBtn)) {

          let innerEditFormId = innerEditForm + delimiter + elementCommentId;
          let innerEditCommentInputId = innerEditCommentInput + delimiter + elementCommentId;
          let innerEditUpdateBtnId = innerEditUpdateBtn + delimiter + elementCommentId;
          let innerEditCancelBtnId = innerEditCancelBtn + delimiter + elementCommentId;
          let newComment = "";

          // if cancel is clicked, reset the comment to last known text
          if ((lastCommentId === elementCommentId) && (elementName === innerEditCancelBtn)) { 
            newComment = lastComment;
            lastComment = lastCommentId = null;
          }    

          // if update is clicked, capture the updated comment value and post submit
          if(elementName === innerEditUpdateBtn) {
            newComment = document.getElementById(innerEditCommentInputId).value.trim();

            if(!newComment) { 
              // alert("Comment cannot be blank");
              document.getElementById(innerEditCommentInputId).value = "";
              document.getElementById(innerEditCommentInputId).placeholder = "Comment cannot be blank!";
              return;
            }

            // trigger form action
            document.getElementById(innerEditFormId).submit();
          }

          // reset the div border
          document.getElementById(editCommentDivId).className = "";

          // change the div html to clear the dynamic form elements and show the static paragraph
          document.getElementById(editCommentDivId).innerHTML = await `<p class="text-justify" id="staticPara:`+ elementCommentId +`">` + newComment + `</p>`;    

          // enable "visible" or authorized edit and delete buttons
          let allEditButtons = document.getElementsByName("outerEditButton")
          for(const editButton of allEditButtons){
            editButton.className = "btn btn-sm btn-warning";
          }
          let allDeleteButtons = document.getElementsByName("outerDeleteButton");
          for(const delButton of allDeleteButtons){
            delButton.className = "btn btn-sm btn-danger";
            delButton.disabled = false;
            delButton.type = "submit"
            delButton.style.cursor = "pointer";
          };
        }
      } //delPos > 0
    } // elementId && elementId.length > 0
  } // arg1 != undefined or null
};

// 03072020 - Gaurav - Show comment author info in a modal window
async function showModal(p_currentObject, p_currentAuthorId) {
  let modalWindow = document.getElementById("showCommentAuthorInfo");
  let innerHTML = `
  <div class="modal-dialog modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-body" style="overflow-y: auto;">
        <button type="button" class="close" data-dismiss="modal">&times;</button>
        <div class="embed-responsive embed-responsive-1by1">
          <iframe class="embed-responsive-item" src="/users/` + p_currentAuthorId + `/inCampComModal"></iframe>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" data-dismiss="modal">Close</button>
      </div>
    </div>
  </div>`;

  modalWindow.innerHTML = await innerHTML;

};