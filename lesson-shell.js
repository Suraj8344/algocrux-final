/* Keeps standalone lessons functional while supplying consistent lesson metadata and practice UI. */
document.addEventListener('DOMContentLoaded',function(){
  var body=document.body, title=(document.querySelector('h1')||{}).textContent||document.title||'Algorithm lesson';
  var slug=(location.pathname.split('/').pop()||'lesson').replace(/\.html$/i,'').toLowerCase();
  var directGfg={
    'count-inversions':'https://www.geeksforgeeks.org/counting-inversions/',
    'recursion-08-count-inversions':'https://www.geeksforgeeks.org/counting-inversions/'
  };
  body.classList.add('ac-lesson');
  var header=document.querySelector('header');
  if(!header){var heading=document.querySelector('h1'); header=heading&&heading.parentElement;}
  if(header){header.classList.add('ac-lesson-header');}
  var badges=document.querySelector('.badges,.badge-row,.ac-metadata');
  if(!badges&&header){badges=document.createElement('div');badges.className='ac-metadata';['Interactive lesson','Algorithm'].forEach(function(label){var tag=document.createElement('span');tag.className='ac-meta';tag.textContent=label;badges.appendChild(tag);});header.insertBefore(badges,header.firstChild);}
  var practice=document.querySelector('.practice,.ac-practice');
  var hasGfg=practice&&/geeksforgeeks|\bGFG\b/i.test(practice.textContent);
  if(directGfg[slug]&&!practice&&header){practice=document.createElement('nav');practice.className='ac-practice';practice.innerHTML='<span class="ac-practice-label">Practice</span>';header.insertAdjacentElement('afterend',practice);}
  if(practice&&!hasGfg&&directGfg[slug]){var separator=document.createElement('span');separator.textContent='·';separator.setAttribute('aria-hidden','true');var gfg=document.createElement('a');gfg.href=directGfg[slug];gfg.target='_blank';gfg.rel='noopener';gfg.textContent='GeeksforGeeks';practice.appendChild(separator);practice.appendChild(gfg);}
  /* Graph lessons use an editable notebook rather than a pre-written static Notes panel. */
  if(/\/questions\/graphs\//i.test(location.pathname)){
    var oldNotes=document.querySelector('.notes:not(.notes-section)');
    if(oldNotes){
      var noteSection=oldNotes.closest('section')||oldNotes.parentElement;
      var noteKey='algocrux_graph_notes_'+slug;
      noteSection.innerHTML='<div class="section-label">My Notes</div><div class="ac-notepad"><div class="ac-notepad-head"><h3>📝 My Notes</h3><span class="ac-note-status" aria-live="polite">Saved locally</span></div><textarea aria-label="Your notes" placeholder="Write your notes, interview tips, or questions about this graph algorithm..."></textarea><div class="ac-notepad-actions"><span>Notes stay on this device.</span><button type="button" class="ac-note-clear">Clear note</button></div></div>';
      var textarea=noteSection.querySelector('textarea'),status=noteSection.querySelector('.ac-note-status'),clear=noteSection.querySelector('.ac-note-clear');
      textarea.value=localStorage.getItem(noteKey)||'';
      textarea.addEventListener('input',function(){localStorage.setItem(noteKey,textarea.value);status.textContent='Saved locally';});
      clear.addEventListener('click',function(){textarea.value='';localStorage.removeItem(noteKey);status.textContent='Note cleared';textarea.focus();});
    }
  }
  if(!document.querySelector('footer')){var footer=document.createElement('footer');footer.textContent='AlgoCrux · '+title.trim()+' · Interactive learning';body.appendChild(footer);}
});
