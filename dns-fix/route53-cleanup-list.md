# Route53 Cleanup List

All these domains need to be migrated from AWS Route53 to Cloudflare.

## Adult/AEIMS Sites (Priority - Currently Broken)
| Domain | Route53 Zone ID | Status |
|--------|-----------------|--------|
| aeims.app | Z0819048KQ6II7V1JPW6 | BROKEN - Points to deleted ALB |
| aeims.app | Z10072032GZWNZRSG9VVW | Duplicate zone |
| sexacomms.com | Z06944652A6PL7SOH92OT | BROKEN - Points to deleted ALB |
| flirts.nyc | Z07876702K972OPEHGGZ5 | BROKEN - Points to deleted ALB |
| nycflirts.com | Z07446796M16YCNQNR7N | BROKEN - Points to deleted ALB |
| 9inchesof.com | Z061864317QI1PFMH1QHV | BROKEN - Points to deleted ALB |
| beastybitches.com | Z0514026G13IONC6E0TJ | BROKEN - Points to deleted ALB |
| cavernof.love | Z02819832SZYY8TOODG5O | BROKEN - Points to deleted ALB |
| dommecats.com | Z08340432M29HHR35AE66 | BROKEN - Points to deleted ALB |
| fantasyflirts.live | Z0779739TIQVDGJNZYLP | BROKEN - Points to deleted ALB |
| gfecalls.com | Z0832972HR3RWKKFEKBQ | BROKEN - Points to deleted ALB |
| holyflirts.com | Z028198135IBE7PIYNW51 | BROKEN - Points to deleted ALB |
| latenite.ai | Z028237716KUV6W49MX4 | BROKEN - Points to deleted ALB |
| latenite.love | Z05080993OOPZ6GNBHOKE | BROKEN - SSL mismatch |
| phonesex.money | Z0778629AEIOI3LOTP1G | BROKEN - Points to deleted ALB |
| shrinkshack.com | Z07790682UXO7AXAIUGTE | BROKEN - Points to deleted ALB |
| psosoundoff.com | Z05320361ZSLWOPDW0ZGV | WORKING (OCI DNS is active) |
| cucking.live | Z07792502RG5ZH2Z8Z8P4 | Using GoDaddy NS |
| sexycams.life | Z090561422RIO290MIBFY | BROKEN |
| nineinchesof.com | Z02797765NHY6B6YHO20 | BROKEN |
| nineinchesof.com | Z04421902IBJEB5G7KL7L | Duplicate zone |
| sexyca.ms | Z0117470MYUD5SFDP6BJ | BROKEN |
| purrr.love | Z0574433DRSWXJOY1AJ7 | BROKEN |
| purrr.me | Z06013423QGE80M2T1RXN | BROKEN |
| afterdark.life | Z04702007XRY6TZHCMWF | BROKEN |
| afterdarkcredits.com | Z07594981YNYH400OFM09 | BROKEN |
| afterdarksys.com | Z027509618XR28UMLCYKV | BROKEN (login redirect target) |

## Other AfterDark Ecosystem Sites
| Domain | Route53 Zone ID | Status |
|--------|-----------------|--------|
| nitetext.com | Z0821713ACQ3BEUVUSDI | Duplicate |
| nitetext.com | Z06771031E9C2POEY0R23 | Duplicate |
| nitetxt.com | Z0672750340D4H8VH72JE | BROKEN |
| nighttex.com | Z07085111V6T3SPG61NB4 | BROKEN |

## Non-Adult Domains
| Domain | Route53 Zone ID | Status |
|--------|-----------------|--------|
| savemycrypto.ai | Z01417861CCIOZ918RXZV | Unknown |
| burnyourex.games | Z01345353PMGICQIA6OW1 | Unknown |
| burnyourex.com | Z098618313WDBA7MF9Q9M | Unknown |
| disease.zone | Z074007829CKEK3UNQ8ZB | Unknown |
| disease.app | Z10151121D5AFF7LORQHT | Unknown |
| heartofatoaster.com | Z0448002YO61AFVQTWBS | Unknown |
| outofwork.life | Z04650013UQD2UUYF2T37 | Unknown |
| politics.place | Z09076483UF584RG4J551 | Unknown |
| lonely.fyi | Z1039088AW3WPLQ8IVEI | Unknown |
| thc.city | Z01627739TE1HKDB3DD3 | Unknown |
| dispensary.services | Z03689801E49CWWP5G4EM | Unknown |
| dnsscience.io | Z04386262OZDG8DLN06LR | Unknown |
| ipscience.io | Z016579937RZ9DRKSWCGE | Unknown |
| veribits.com | Z08131853P82ZUKIO9VC9 | Unknown |
| undatable.me | Z046721432YJD4U15GPDP | Unknown |
| 9lives.xyz | Z079192534V5MCSQUDKDR | Unknown |

## Local/Private Zones (Can Delete)
| Domain | Route53 Zone ID |
|--------|-----------------|
| nitetext.local | Z02082812YACV3SS357DB |
| heartofatoaster.local | Z1018537GUSA0QPSL2WM |
| aeims.local | Z02066783CTT23BQ50MMN |

---

## Action Required

1. **Add these domains to Cloudflare** (user needs to do this at Cloudflare dashboard)
2. **Update registrar nameservers** to point to Cloudflare
3. **Delete Route53 hosted zones** once Cloudflare is active
4. **Configure A records** in Cloudflare pointing to correct origin server

## Question: Where should adult sites be hosted?

Currently psosoundoff.com works at 129.153.158.177 (OCI), but you said no adult sites on Oracle.
Where should the A records point to?
