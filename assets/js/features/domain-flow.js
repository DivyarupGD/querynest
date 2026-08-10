// Domain cards start a focused, sequential 20-question learning path.
let activeDomainPrefix=null;const baseRenderProblemList=renderList;renderList=function(){if(!activeDomainPrefix){baseRenderProblemList();return;}const domainProblemsOnly=problems.map((problem,index)=>({problem,index})).filter(({problem})=>problem.id.startsWith(activeDomainPrefix));document.querySelector('#problemList').innerHTML=domainProblemsOnly.map(({problem,index})=>`<button class="problem-item ${index===current?'active':''}" data-i="${index}"><span class="problem-id">${problem.id.slice(-2)}</span><span class="problem-name">${problem.title.replace(/^.*?: /,'')}</span><span class="level-dot ${problem.level.toLowerCase()}"></span></button>`).join('');document.querySelectorAll('.problem-item').forEach(button=>button.onclick=()=>loadProblem(+button.dataset.i));};
openDomain=async function(key){
  const domain=domains.find(item=>item.key===key);
  document.body.classList.add('domain-session');
  activeDomainPrefix=key.slice(0,2).toUpperCase();
  if(!loadedDomainKeys.has(key)){
    problems.push(...domainProblems(domain));
    loadedDomainKeys.add(key);
  }
  if(typeof loadSolvedProblems==='function') await loadSolvedProblems();
  renderList();
  showPractice('domain');
  const domainQuestions=problems.map((problem,index)=>({problem,index})).filter(({problem})=>problem.id.startsWith(activeDomainPrefix));
  const nextUnsolved=domainQuestions.find(({problem})=>!solvedProblemCodes.has(problem.id));
  loadProblem((nextUnsolved||domainQuestions[0]).index);
  document.querySelector('#sidebar').classList.remove('open');
};
updateQuestionNavigation=function(){const problem=problems[current];const navigation=document.querySelector('#questionNav');if(!problem||!domainCodePattern.test(problem.id)){navigation.hidden=true;return;}const prefix=problem.id.slice(0,2);const indexes=problems.map((item,index)=>({item,index})).filter(({item})=>item.id.startsWith(prefix)).map(({index})=>index);const position=indexes.indexOf(current),percent=((position+1)/indexes.length)*100;navigation.hidden=false;document.querySelector('#questionPosition').innerHTML=`<div class="domain-sequence"><div class="domain-sequence-head"><span>Question ${position+1} / ${indexes.length}</span><span>${Math.round(percent)}%</span></div><div class="domain-sequence-track"><i style="width:${percent}%"></i></div></div>`;document.querySelector('#previousQuestion').disabled=position===0;document.querySelector('#nextQuestion').disabled=position===indexes.length-1;document.querySelector('#previousQuestion').onclick=()=>{if(position>0)loadProblem(indexes[position-1]);};document.querySelector('#nextQuestion').onclick=()=>{if(position<indexes.length-1)loadProblem(indexes[position+1]);};};
document.querySelector('#practiceLink').addEventListener('click',()=>{activeDomainPrefix=null;renderList();});
