package com.celebratehub.model;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;

@Entity
@Table(name = "guests", uniqueConstraints = @UniqueConstraint(columnNames = "phone"))
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String firstName;
    @NotBlank
    private String lastName;
    private String email;
    @NotBlank
    private String phone;

    private String referencePerson;
    private String guestType; // FAMILY, FRIEND, VIP, COLLEAGUE, OTHER

    // ADDRESS (India-focused)
    private String country;
    private String state;
    private String district;
    private String village;

    public Guest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getReferencePerson() { return referencePerson; }
    public void setReferencePerson(String referencePerson) { this.referencePerson = referencePerson; }

    public String getGuestType() { return guestType; }
    public void setGuestType(String guestType) { this.guestType = guestType; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }
}
