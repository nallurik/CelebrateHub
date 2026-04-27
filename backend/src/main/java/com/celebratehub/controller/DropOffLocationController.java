package com.celebratehub.controller;

import com.celebratehub.model.DropOffLocation;
import com.celebratehub.repository.DropOffLocationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/drop-off-locations")
public class DropOffLocationController {

    private final DropOffLocationRepository repo;

    public DropOffLocationController(DropOffLocationRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<DropOffLocation> list() {
        return repo.findAllByOrderByNameAsc();
    }

    @PostMapping
    public DropOffLocation create(@Valid @RequestBody DropOffLocation loc) {
        return repo.save(loc);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DropOffLocation> update(@PathVariable Long id, @Valid @RequestBody DropOffLocation body) {
        return repo.findById(id).map(existing -> {
            existing.setName(body.getName());
            existing.setLocationType(body.getLocationType());
            existing.setAddress(body.getAddress());
            existing.setContactPerson(body.getContactPerson());
            existing.setContactPhone(body.getContactPhone());
            existing.setNotes(body.getNotes());
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
