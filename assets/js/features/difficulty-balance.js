// Interview-focused progression: 2 Easy, 5 Medium, 8 Hard, and 5 Super Hard per domain.
labTemplates.forEach((template,index)=>{template[1]=index<2?'Easy':index<7?'Medium':index<15?'Hard':'Super Hard';});
