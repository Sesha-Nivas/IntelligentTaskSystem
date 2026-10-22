package com.example.taskmanager.service;
import com.example.taskmanager.model.*; import com.example.taskmanager.repository.*; import com.example.taskmanager.dto.*; import org.springframework.stereotype.Service; import org.springframework.messaging.simp.SimpMessagingTemplate; import java.time.*; import java.util.*;
@Service public class TaskService { private final TaskRepository repo; private final UserRepository users; private final PriorityService priority; private final SimpMessagingTemplate ws; public TaskService(TaskRepository r,UserRepository u,PriorityService p,SimpMessagingTemplate w){repo=r;users=u;priority=p;ws=w;}
 private User user(String email){return users.findByEmail(email).orElseThrow();}
 public List<Task> all(String email){return repo.findByUserIdOrderByPriorityScoreDesc(user(email).getId());}
 public Task save(String email,TaskRequest x){Task t=new Task(); t.setUser(user(email)); return fill(t,x);}
 public Task update(String email,Long id,TaskRequest x){Task t=repo.findById(id).orElseThrow(); if(!t.getUser().getEmail().equals(email)) throw new RuntimeException("Forbidden"); return fill(t,x);}
 private Task fill(Task t,TaskRequest x){t.setTitle(x.title());t.setDescription(x.description());t.setDeadline(x.deadline());t.setImportance(x.importance());t.setEstimatedHours(x.estimatedHours()); if(x.status()!=null)t.setStatus(x.status()); t.setUpdatedAt(LocalDateTime.now()); priority.calculate(t); Task out=repo.save(t); ws.convertAndSend("/topic/tasks/"+t.getUser().getId(),out); return out;}
 public void delete(String email,Long id){Task t=repo.findById(id).orElseThrow();if(!t.getUser().getEmail().equals(email))throw new RuntimeException("Forbidden");repo.delete(t);ws.convertAndSend("/topic/tasks/"+t.getUser().getId(),"deleted:"+id);}
 public Map<String,Object> stats(String email){User u=user(email); long total=repo.countByUserId(u.getId()),done=repo.countByUserIdAndStatus(u.getId(),"COMPLETED"),pending=repo.countByUserIdAndStatus(u.getId(),"PENDING"),over=repo.countByUserIdAndDeadlineBeforeAndStatusNot(u.getId(),LocalDateTime.now(),"COMPLETED");return Map.of("total",total,"completed",done,"pending",pending,"overdue",over);}
}
