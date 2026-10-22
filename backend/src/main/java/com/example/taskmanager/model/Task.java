package com.example.taskmanager.model;
import jakarta.persistence.*; import lombok.*; import java.time.LocalDateTime;
@Entity @Table(name="tasks") @Getter @Setter @NoArgsConstructor
public class Task { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(optional=false) private User user; @Column(nullable=false) private String title; @Column(length=2000) private String description; @Column(nullable=false) private LocalDateTime deadline; private int importance; private double estimatedHours; private int priorityScore; private String priority; private String status="PENDING"; private boolean reminderSent=false; private LocalDateTime createdAt=LocalDateTime.now(); private LocalDateTime updatedAt=LocalDateTime.now(); }
