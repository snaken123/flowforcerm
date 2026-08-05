import { PrismaClient, Role, MemberStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const members = [
  {"memberNumber": "402300001", "firstName": "Nuke Zeus Absolon", "lastName": "Paz", "email": "nuke@morellimedical.com", "phone": "9952768501", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-11-27"},
  {"memberNumber": "402300002", "firstName": "Jhumel", "lastName": "Bonganciso", "email": "jhumelbonganciso04@gmail.com", "phone": "9993555566", "gender": "Male", "dateOfBirth": "1999-05-04", "joinDate": "2024-11-02"},
  {"memberNumber": "402300003", "firstName": "Miguel", "lastName": "Buhay", "email": "miguelbuhay@gmail.com", "phone": "9178076976", "gender": "Male", "dateOfBirth": "1976-06-09", "joinDate": "2024-11-05"},
  {"memberNumber": "402300004", "firstName": "Mark Jorhez", "lastName": "Aguilar", "email": "jorhez@yahoo.com", "phone": "9608564320", "gender": "Other", "dateOfBirth": null, "joinDate": "2024-11-27"},
  {"memberNumber": "402300005", "firstName": "Kevin Ron", "lastName": "Villacorte", "email": "kev.villacorte@gmail.com", "phone": "9176560727", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-11-30"},
  {"memberNumber": "402300006", "firstName": "Luigi", "lastName": "Torres", "email": "torresluigi@gmail.com", "phone": "9053133859", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-11-29"},
  {"memberNumber": "402300007", "firstName": "Manuel Kyd Thomas", "lastName": "Nagpala", "email": "monagpala@gmail.com", "phone": "9474800275", "gender": "Other", "dateOfBirth": "1999-12-03", "joinDate": "2024-12-04"},
  {"memberNumber": "402300008", "firstName": "Rensi", "lastName": "Rosales", "email": "rensi.rosales@gmail.com", "phone": "9493482881", "gender": "Male", "dateOfBirth": "1983-05-18", "joinDate": "2024-11-27"},
  {"memberNumber": "402300009", "firstName": "Rian", "lastName": "Seranilla", "email": "rianserranilla@yahoo.com", "phone": "", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-12-04"},
  {"memberNumber": "402300010", "firstName": "Justine Chris", "lastName": "Navarez", "email": "navarezjustinechris@gmail.com", "phone": "9167758213", "gender": "Female", "dateOfBirth": "1997-12-27", "joinDate": "2024-12-03"},
  {"memberNumber": "402300011", "firstName": "Ron David", "lastName": "Dimapilis", "email": "rondavid.dimapilis@gmail.com", "phone": "9760442602", "gender": "Other", "dateOfBirth": null, "joinDate": "2024-12-09"},
  {"memberNumber": "402300012", "firstName": "Aiza", "lastName": "Cabingan", "email": "icingpedrina@gmail.com", "phone": "9760369875", "gender": "Female", "dateOfBirth": null, "joinDate": "2024-12-09"},
  {"memberNumber": "402300013", "firstName": "Lara Jane", "lastName": "San Juan", "email": "larajanesanjuan@gmail.com", "phone": "9985730426", "gender": "Female", "dateOfBirth": "1997-04-26", "joinDate": "2024-12-06"},
  {"memberNumber": "402300014", "firstName": "Felix", "lastName": "Gregorio", "email": "peliksgreg@gmail.com", "phone": "9369926970", "gender": "Male", "dateOfBirth": "1997-12-16", "joinDate": "2024-12-06"},
  {"memberNumber": "402300015", "firstName": "Al Bien", "lastName": "Salvador", "email": "albien.salvador@gmail.com", "phone": "9667998080", "gender": "Male", "dateOfBirth": "1999-10-27", "joinDate": "2024-12-21"},
  {"memberNumber": "402300016", "firstName": "Ernest John", "lastName": "Tepaurel", "email": "thedapoll0@gmail.com", "phone": "9762420355", "gender": "Male", "dateOfBirth": "2002-12-12", "joinDate": "2024-12-20"},
  {"memberNumber": "402300018", "firstName": "Joanne Pauline", "lastName": "David", "email": "joannepauline.david@gmail.com", "phone": "9052866646", "gender": "Female", "dateOfBirth": null, "joinDate": "2024-11-30"},
  {"memberNumber": "402300019", "firstName": "Joshua", "lastName": "Oliveros", "email": "josh.oliveros344@gmail.com", "phone": "9940915179", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-12-27"},
  {"memberNumber": "402300020", "firstName": "Ramuel", "lastName": "Tolentino", "email": "ramuelplatino@gmail.com", "phone": "9471747170", "gender": "Other", "dateOfBirth": "1998-08-28", "joinDate": "2024-12-27"},
  {"memberNumber": "402300021", "firstName": "Gelica", "lastName": "Calupig", "email": "annegelicamaecalupig@gmail.com", "phone": "9561362061", "gender": "Female", "dateOfBirth": "1998-10-24", "joinDate": "2024-12-27"},
  {"memberNumber": "402300022", "firstName": "Jullani Alexi", "lastName": "Estrella", "email": "jullanialexi7@gmail.com", "phone": "9278510777", "gender": "Female", "dateOfBirth": "2001-11-20", "joinDate": "2024-12-10"},
  {"memberNumber": "402300023", "firstName": "Kelly", "lastName": "Morrison", "email": "kellysuemorrison@gmail.com", "phone": "9088113704", "gender": "Female", "dateOfBirth": "1997-08-26", "joinDate": "2025-01-02"},
  {"memberNumber": "402300024", "firstName": "Sebastian", "lastName": "Quiat", "email": "sebastianinigomquiatalt@gmail.com", "phone": "9605287802", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-12-06"},
  {"memberNumber": "402300025", "firstName": "Gab", "lastName": "Cervantes", "email": "gabrieldcervantes@gmail.com", "phone": "9178291101", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-11-27"},
  {"memberNumber": "402300026", "firstName": "Michelle", "lastName": "Geromo", "email": "chegrm@yahoo.com", "phone": "9053152812", "gender": "Female", "dateOfBirth": null, "joinDate": "2024-12-05"},
  {"memberNumber": "402300027", "firstName": "Nicole", "lastName": "Tan", "email": "nikatan04@gmail.com", "phone": "", "gender": "Other", "dateOfBirth": null, "joinDate": "2024-12-10"},
  {"memberNumber": "402300028", "firstName": "Seth Lucas", "lastName": "Marasigan", "email": "slmarasigan08@gmail.com", "phone": "9989689319", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-15"},
  {"memberNumber": "402300029", "firstName": "Kier", "lastName": "Petes", "email": "jezapetes@gmail.com", "phone": "9178605710", "gender": "Other", "dateOfBirth": "1999-01-11", "joinDate": "2025-01-16"},
  {"memberNumber": "402300030", "firstName": "Annie Lee", "lastName": "Romanos", "email": "bravoannielee@gmail.com", "phone": "9563946797", "gender": "Other", "dateOfBirth": "1991-04-19", "joinDate": "2025-01-14"},
  {"memberNumber": "402300031", "firstName": "Glenford", "lastName": "Alvaira", "email": "anirtak09@yahoo.com", "phone": "9175231186", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-18"},
  {"memberNumber": "402300032", "firstName": "Johann Michael", "lastName": "Caayao", "email": "johanncaayao@gmail.com", "phone": "9255572334", "gender": "Other", "dateOfBirth": "2002-08-18", "joinDate": "2025-01-18"},
  {"memberNumber": "402300033", "firstName": "Gnery", "lastName": "Gualberto", "email": "geemgualberto@gmail.com", "phone": "9164950223", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-03"},
  {"memberNumber": "402300034", "firstName": "Janine Michaela", "lastName": "Caayao", "email": "janine.caayao@gmail.com", "phone": "9258311298", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-01-18"},
  {"memberNumber": "402300035", "firstName": "Candy", "lastName": "Mendoza", "email": "candyduds@gmail.com", "phone": "9569226252", "gender": "Female", "dateOfBirth": "1989-10-31", "joinDate": "2025-01-18"},
  {"memberNumber": "402300036", "firstName": "Kathrine", "lastName": "Adalia", "email": "kathrineberroya91@gmail.com", "phone": "9061182763", "gender": "Other", "dateOfBirth": "1991-09-01", "joinDate": "2025-01-23"},
  {"memberNumber": "402300037", "firstName": "Miguel", "lastName": "Romero", "email": "kevinpromero16@gmail.com", "phone": "9173274688", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-24"},
  {"memberNumber": "402300038", "firstName": "Christine", "lastName": "Carreon", "email": "carreoncb@gmail.com", "phone": "9209492943", "gender": "Female", "dateOfBirth": null, "joinDate": "2024-11-27"},
  {"memberNumber": "402300039", "firstName": "Nicole", "lastName": "Ocoma", "email": "nicole.ocoma@gmail.com", "phone": "", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-01-12"},
  {"memberNumber": "402300040", "firstName": "David Marvin", "lastName": "Gacutan", "email": "davidgacutan@yahoo.com", "phone": "9688543269", "gender": "Male", "dateOfBirth": "1996-11-22", "joinDate": "2025-01-29"},
  {"memberNumber": "402300041", "firstName": "Reynulf", "lastName": "Romanos", "email": "reynulf.romanos@gmail.com", "phone": "9159205873", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-29"},
  {"memberNumber": "402300042", "firstName": "Leo", "lastName": "Cuyong", "email": "lcuyongiii@gmail.com", "phone": "9177128981", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-24"},
  {"memberNumber": "402300043", "firstName": "K Aian", "lastName": "Orallo", "email": "anqorallo@gmail.com", "phone": "9178321033", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-01-26"},
  {"memberNumber": "402300044", "firstName": "Benjamin III", "lastName": "Garcia", "email": "bagbenjamin20@gmail.com", "phone": "", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-24"},
  {"memberNumber": "402300045", "firstName": "Jack", "lastName": "Ofiaza", "email": "jackofiaza@gmail.com", "phone": "9173014359", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-01-28"},
  {"memberNumber": "402300046", "firstName": "Kimberly", "lastName": "Pagayonan", "email": "kimvpagayonan@gmail.com", "phone": "9153892711", "gender": "Other", "dateOfBirth": "1994-06-12", "joinDate": "2025-02-08"},
  {"memberNumber": "402300047", "firstName": "Anthony John", "lastName": "Prado", "email": "aejhayprado13@gmail.com", "phone": "9081512780", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-28"},
  {"memberNumber": "402300048", "firstName": "Elieza", "lastName": "Rondolo", "email": "zangrondolo@gmail.com", "phone": "9161630231", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-02-08"},
  {"memberNumber": "402300049", "firstName": "Marivic", "lastName": "Bautista", "email": "marivicderamonbautista@gmail.com", "phone": "9272692110", "gender": "Other", "dateOfBirth": "1997-02-22", "joinDate": "2025-01-29"},
  {"memberNumber": "402300050", "firstName": "Gabriele Enzo", "lastName": "Salta", "email": "enzo.salta@yahoo.com", "phone": "9173165730", "gender": "Other", "dateOfBirth": "1996-08-19", "joinDate": "2025-01-29"},
  {"memberNumber": "402300051", "firstName": "Gabriel", "lastName": "Bugaria", "email": "gabgelo@gmail.com", "phone": "", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-02-12"},
  {"memberNumber": "402300052", "firstName": "Jeff", "lastName": "Bayran", "email": "jdanielbayran@gmail.com", "phone": "9150617627", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-02-13"},
  {"memberNumber": "402300053", "firstName": "James", "lastName": "Borja", "email": "obias_ideas@yahoo.com.ph", "phone": "", "gender": "Male", "dateOfBirth": "1988-12-04", "joinDate": "2025-02-12"},
  {"memberNumber": "402300054", "firstName": "Jose Gabriel", "lastName": "Ferrer", "email": "ferrer_josegabriel@yahoo.com", "phone": "9175007530", "gender": "Male", "dateOfBirth": null, "joinDate": "2024-12-09"},
  {"memberNumber": "402300055", "firstName": "Zed", "lastName": "Arpia", "email": "arpiazedrick@gmail.com", "phone": "9956528946", "gender": "Male", "dateOfBirth": "2005-01-04", "joinDate": "2024-11-10"},
  {"memberNumber": "402300056", "firstName": "Chase Emmanuelle", "lastName": "Mapalo", "email": "jpmapalo@gmail.com", "phone": "9198020400", "gender": "Male", "dateOfBirth": "2010-01-06", "joinDate": "2024-11-30"},
  {"memberNumber": "402300057", "firstName": "Dana", "lastName": "Sabijon", "email": "danasab.fit@gmail.com", "phone": "9175125425", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-02-21"},
  {"memberNumber": "402300058", "firstName": "Alexandria", "lastName": "Harina", "email": "alexandriaharina01@gmail.com", "phone": "9777650114", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-03-06"},
  {"memberNumber": "402300059", "firstName": "Riva", "lastName": "Rolle", "email": "rivamargotrolle@gmail.com", "phone": "9062652246", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-03-06"},
  {"memberNumber": "402300060", "firstName": "Carl Justin", "lastName": "Carandang", "email": "carl.vallesteros@gmail.com", "phone": "9613439936", "gender": "Male", "dateOfBirth": "2007-12-13", "joinDate": "2025-03-14"},
  {"memberNumber": "402300061", "firstName": "Justin", "lastName": "Sabijon", "email": "sabijonjustin@gmail.com", "phone": "9175510294", "gender": "Other", "dateOfBirth": "1994-10-29", "joinDate": "2025-03-05"},
  {"memberNumber": "402300062", "firstName": "Mhello", "lastName": "Espejo", "email": "emhello.ge@gmail.com", "phone": "", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-03-16"},
  {"memberNumber": "402300063", "firstName": "Kevin", "lastName": "Romero", "email": "attyrmlaw@gmail.com", "phone": "9173274688", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-01-25"},
  {"memberNumber": "402300064", "firstName": "Irish", "lastName": "Vinluan", "email": "vinluanirish@gmail.com", "phone": "9176228763", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-03-15"},
  {"memberNumber": "402300065", "firstName": "Astrid", "lastName": "Batocael", "email": "roiezan@yahoo.com", "phone": "9356731212", "gender": "Female", "dateOfBirth": "2020-05-04", "joinDate": "2025-04-03"},
  {"memberNumber": "402300066", "firstName": "Euclyd EJ", "lastName": "Ang", "email": "abbaeco2019@gmail.com", "phone": "9054684388", "gender": "Male", "dateOfBirth": "2016-06-02", "joinDate": "2025-04-09"},
  {"memberNumber": "402300067", "firstName": "Paul Albert", "lastName": "Manuel", "email": "paulalbertmanuel@gmail.com", "phone": "9176207931", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-04-05"},
  {"memberNumber": "402300068", "firstName": "Chance", "lastName": "Ang", "email": "chrisang69@gmail.com", "phone": "", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-04-09"},
  {"memberNumber": "402300069", "firstName": "Ralph", "lastName": "Gemeniano", "email": "ralph.gemeniano@gmail.com", "phone": "9178431925", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-04-17"},
  {"memberNumber": "402300070", "firstName": "Maria Simeona", "lastName": "Delprado", "email": "mia.dp08@gmail.com", "phone": "9057847302", "gender": "Female", "dateOfBirth": null, "joinDate": "2024-12-18"},
  {"memberNumber": "402300071", "firstName": "Jarred Drayke", "lastName": "Maquiniana", "email": "darsine.maquiniana@gmail.com", "phone": "9171260398", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-04-22"},
  {"memberNumber": "402300072", "firstName": "Aljay", "lastName": "Bacay", "email": "ajbacay1218@gmail.com", "phone": "9617198278", "gender": "Other", "dateOfBirth": "1997-10-10", "joinDate": "2025-04-22"},
  {"memberNumber": "402300073", "firstName": "Sofia Louise Ysabel", "lastName": "Lopena", "email": "iampaolagamboa@yahoo.com", "phone": "9064043509", "gender": "Female", "dateOfBirth": "2015-02-21", "joinDate": "2025-04-21"},
  {"memberNumber": "402300074", "firstName": "Aeesha Sadie A", "lastName": "Barrameda", "email": "amray_santin@yahoo.com", "phone": "9213615945", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-04-26"},
  {"memberNumber": "402300075", "firstName": "Cyrus", "lastName": "Carino", "email": "cyruscarino@me.com", "phone": "9190023239", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-04-03"},
  {"memberNumber": "402300076", "firstName": "Marcus Louis Inigo", "lastName": "Lopena", "email": "lopenamarcuslouisinigo@gmail.com", "phone": "9064043509", "gender": "Other", "dateOfBirth": "2013-07-25", "joinDate": "2025-04-21"},
  {"memberNumber": "402300077", "firstName": "Jarred", "lastName": "Racino", "email": "jbdomdom@gmail.com", "phone": "9272559153", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-04-28"},
  {"memberNumber": "402300078", "firstName": "Lucia Robert", "lastName": "Mendoza", "email": "lxpmendozaphi@gmail.com", "phone": "9278540677", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-04-29"},
  {"memberNumber": "402300079", "firstName": "Kaleb", "lastName": "Bautista", "email": "bautista.annlorraine@yahoo.com", "phone": "9178085233", "gender": "Other", "dateOfBirth": "2020-04-22", "joinDate": "2025-04-22"},
  {"memberNumber": "402300081", "firstName": "Hailey", "lastName": "Bautista", "email": "mabb.bautistalaw@outlook.com", "phone": "9474312580", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-04-22"},
  {"memberNumber": "402300082", "firstName": "Joanna", "lastName": "Canas", "email": "jmdcanas@gmail.com", "phone": "9063262891", "gender": "Female", "dateOfBirth": "1988-05-29", "joinDate": "2025-05-01"},
  {"memberNumber": "402300083", "firstName": "Alexandra Venice", "lastName": "Medel", "email": "donnabelporlaje23@gmail.com", "phone": "9066477502", "gender": "Female", "dateOfBirth": "2014-06-11", "joinDate": "2025-05-07"},
  {"memberNumber": "402300084", "firstName": "James Tithus", "lastName": "Manalo", "email": "racelmanalo18@gmail.com", "phone": "9918308725", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-05-10"},
  {"memberNumber": "402300085", "firstName": "Kaia", "lastName": "Ricarro", "email": "potricarro@gmail.com", "phone": "9278475543", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-05-23"},
  {"memberNumber": "402300086", "firstName": "Derron Gabriel", "lastName": "Salas", "email": "derronosio@yahoo.com", "phone": "9602652695", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-06-02"},
  {"memberNumber": "402300087", "firstName": "Sarah", "lastName": "Trinidad", "email": "sarahvtrinidad@gmail.com", "phone": "9171880884", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-05-14"},
  {"memberNumber": "402300088", "firstName": "Maria Elaine", "lastName": "Popatco", "email": "mariaelainep@yahoo.com", "phone": "9399196979", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-06-03"},
  {"memberNumber": "402300089", "firstName": "Evangelo", "lastName": "Villanueva", "email": "evangelojvillanueva@gmail.com", "phone": "9542588494", "gender": "Male", "dateOfBirth": "1988-12-31", "joinDate": "2025-04-30"},
  {"memberNumber": "402300090", "firstName": "Harley Arren", "lastName": "Solita", "email": "leyarrensolita@gmail.com", "phone": "9266991195", "gender": "Male", "dateOfBirth": "1995-01-17", "joinDate": "2025-06-21"},
  {"memberNumber": "402300091", "firstName": "Aldrin", "lastName": "De Jesus", "email": "aldrin.dejesus14@gmail.com", "phone": "9055823258", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-07-05"},
  {"memberNumber": "402300092", "firstName": "Kristia", "lastName": "Marasigan", "email": "13tiaboy@gmail.com", "phone": "9688816121", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-07-12"},
  {"memberNumber": "402300093", "firstName": "Emerson Paul", "lastName": "Bongiad", "email": "mexterbongiad@gmail.com", "phone": "9277939698", "gender": "Other", "dateOfBirth": "1998-03-27", "joinDate": "2024-12-03"},
  {"memberNumber": "402300094", "firstName": "John Dale", "lastName": "Alzona", "email": "johndale.md27@gmail.com", "phone": "9062160422", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-08-24"},
  {"memberNumber": "402300095", "firstName": "Fides Zita", "lastName": "Gomez", "email": "fideszitagomez@gmail.com", "phone": "9267287268", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-08-14"},
  {"memberNumber": "402300096", "firstName": "Ivan", "lastName": "Mariano", "email": "marianoivan100815@gmail.com", "phone": "9760280810", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-09-06"},
  {"memberNumber": "402300097", "firstName": "Rasmiyah", "lastName": "Alhusinawi", "email": "biemagz@gmail.com", "phone": "9209069123", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-08-20"},
  {"memberNumber": "402300098", "firstName": "Dennis", "lastName": "Rayos Marmeto", "email": "dennisrayos01@gmail.com", "phone": "9624381674", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-09-13"},
  {"memberNumber": "402300099", "firstName": "Shiela Mae", "lastName": "Alisasis", "email": "alisasisshielamae0@gmail.com", "phone": "9171640151", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-09-03"},
  {"memberNumber": "402300100", "firstName": "Mike", "lastName": "Cinco", "email": "mike.cinco@aol.com", "phone": "9088612016", "gender": "Other", "dateOfBirth": "1984-10-21", "joinDate": "2025-09-29"},
  {"memberNumber": "402300101", "firstName": "Nikon L", "lastName": "Celis", "email": "nikoncelis@gmail.com", "phone": "9194899218", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-10-09"},
  {"memberNumber": "402300102", "firstName": "Luiz Miguel", "lastName": "Montenegro", "email": "lunamontenegro47@gmail.com", "phone": "9952118164", "gender": "Male", "dateOfBirth": "2004-09-04", "joinDate": "2025-10-16"},
  {"memberNumber": "402300103", "firstName": "Humphrey-An", "lastName": "Riomalos", "email": "humphreyanr@gmail.com", "phone": "9684765576", "gender": "Female", "dateOfBirth": "1999-02-02", "joinDate": "2025-10-10"},
  {"memberNumber": "402300104", "firstName": "Doreen", "lastName": "Firaza", "email": "dlfiraza@gmail.com", "phone": "9159077550", "gender": "Female", "dateOfBirth": "1998-09-30", "joinDate": "2025-10-24"},
  {"memberNumber": "402300105", "firstName": "Jecka", "lastName": "Jungaya", "email": "jungaya.jecka@gmail.com", "phone": "9154245264", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-09-09"},
  {"memberNumber": "402300106", "firstName": "Nina", "lastName": "Salido", "email": "ninaluisa.salido@gmail.com", "phone": "9178497391", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-05-05"},
  {"memberNumber": "402300107", "firstName": "John Yngwie", "lastName": "Abundo", "email": "johnabundo1995@gmail.com", "phone": "9653342640", "gender": "Male", "dateOfBirth": "1995-12-23", "joinDate": "2025-07-11"},
  {"memberNumber": "402300108", "firstName": "John", "lastName": "Abundo", "email": "abundojohnyngwie@gmail.com", "phone": "9653342640", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-10-06"},
  {"memberNumber": "402300109", "firstName": "Anthony Doyle", "lastName": "Uychoco", "email": "dpuychoco@gmail.com", "phone": "9688538004", "gender": "Other", "dateOfBirth": null, "joinDate": "2025-12-06"},
  {"memberNumber": "402300110", "firstName": "Luke", "lastName": "Agcaoili", "email": "cumpajanellamarie@gmail.com", "phone": "9158573486", "gender": "Male", "dateOfBirth": "2020-08-28", "joinDate": "2025-11-29"},
  {"memberNumber": "402300111", "firstName": "Jose Luis", "lastName": "Tiongson", "email": "joseluistiongson@gmail.com", "phone": "9054675639", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-12-15"},
  {"memberNumber": "402300112", "firstName": "Calihx", "lastName": "Padua", "email": "paduagreizthomascalihx@gmail.com", "phone": "9937317671", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-11-18"},
  {"memberNumber": "402300113", "firstName": "Sherwin", "lastName": "Adefuin II", "email": "awiwin224@gmail.com", "phone": "9189129145", "gender": "Male", "dateOfBirth": "2013-02-24", "joinDate": "2025-10-04"},
  {"memberNumber": "402300114", "firstName": "Seth Roi", "lastName": "Adefuin", "email": "wynseth@gmail.com", "phone": "9763711057", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-04-26"},
  {"memberNumber": "402300115", "firstName": "Saher", "lastName": "Tarrish", "email": "sahertarrish@gmail.com", "phone": "9497546490", "gender": "Male", "dateOfBirth": "1998-11-27", "joinDate": "2024-11-30"},
  {"memberNumber": "402300116", "firstName": "Jennyfer A", "lastName": "Desipeda", "email": "jradesipeda@gmail.com", "phone": "9175175674", "gender": "Other", "dateOfBirth": "1986-01-27", "joinDate": "2026-02-09"},
  {"memberNumber": "402300117", "firstName": "Ana Francine", "lastName": "Selorio", "email": "francineselorio15@gmail.com", "phone": "9636664877", "gender": "Female", "dateOfBirth": null, "joinDate": "2025-11-30"},
  {"memberNumber": "402300118", "firstName": "Luigi Marvic", "lastName": "Feliciano", "email": "luigifeliciano.law@gmail.com", "phone": "9163043110", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-02-13"},
  {"memberNumber": "402300119", "firstName": "Matthew", "lastName": "Galimba", "email": "matthewmiguel.galimba@gmail.com", "phone": "9175851436", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-02-28"},
  {"memberNumber": "402300120", "firstName": "Kvy", "lastName": "Anoza", "email": "kvyagcaoili1128@gmail.com", "phone": "9774037855", "gender": "Female", "dateOfBirth": "1992-11-28", "joinDate": "2026-03-04"},
  {"memberNumber": "402300121", "firstName": "Brix Franco", "lastName": "Pili", "email": "deegracequindoza@yahoo.com", "phone": "9178622380", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-03-07"},
  {"memberNumber": "402300122", "firstName": "Katya", "lastName": "Espiritu", "email": "katyaespiritu23@gmail.com", "phone": "9664592058", "gender": "Female", "dateOfBirth": "1994-05-23", "joinDate": "2025-11-20"},
  {"memberNumber": "402300123", "firstName": "Gabriel Ross", "lastName": "Alvarado", "email": "grmalvarado22@gmail.com", "phone": "9270843704", "gender": "Other", "dateOfBirth": "2004-10-22", "joinDate": "2026-03-12"},
  {"memberNumber": "402300124", "firstName": "Rinelyn", "lastName": "Miras", "email": "rinamiras30@gmail.com", "phone": "9913415764", "gender": "Female", "dateOfBirth": "1998-08-30", "joinDate": "2026-03-02"},
  {"memberNumber": "402300125", "firstName": "Catrina Bianca", "lastName": "Natalio", "email": "catrinabianca.natalio054@gmail.com", "phone": "9663641414", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-03-20"},
  {"memberNumber": "402300126", "firstName": "Ailene", "lastName": "Nano", "email": "ailenevillamater@gmail.com", "phone": "9175766730", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-03-28"},
  {"memberNumber": "402300127", "firstName": "Athena Vanelope", "lastName": "Roldan", "email": "carminacastillejos27@gmail.com", "phone": "", "gender": "Female", "dateOfBirth": null, "joinDate": "2024-12-06"},
  {"memberNumber": "402300128", "firstName": "Graciela", "lastName": "Nabuab", "email": "nabuabgraciela@gmail.com", "phone": "", "gender": "Female", "dateOfBirth": null, "joinDate": "2026-03-29"},
  {"memberNumber": "402300129", "firstName": "Matthew", "lastName": "Estavillo", "email": "estavillokim@yahoo.com", "phone": "9054431599", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-04-05"},
  {"memberNumber": "402300130", "firstName": "Juneph", "lastName": "Morado", "email": "juneph.mission.morado@gmail.com", "phone": "9178790027", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-04-06"},
  {"memberNumber": "402300131", "firstName": "Raien Fritz", "lastName": "Ticar", "email": "abigailpdeleon@gmail.com", "phone": "9064904206", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-03-25"},
  {"memberNumber": "402300132", "firstName": "Andrei Zaire Matthew", "lastName": "Divinagracia", "email": "divinagracia.personal@gmail.com", "phone": "9776538354", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-07"},
  {"memberNumber": "402300133", "firstName": "Vanessa", "lastName": "Denina", "email": "deninavanessa@gmail.com", "phone": "9294734440", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-09"},
  {"memberNumber": "402300134", "firstName": "Emmanuel", "lastName": "Mesoga", "email": "mesoga_emmanuel@yahoo.com", "phone": "9171279084", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-11"},
  {"memberNumber": "402300135", "firstName": "Bea", "lastName": "Kalaw", "email": "bea.kalaw@gmail.com", "phone": "9761000037", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-12"},
  {"memberNumber": "402300136", "firstName": "Ramon Gerardo", "lastName": "Soldevilla", "email": "soldevillaramon@gmail.com", "phone": "9474484518", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-07"},
  {"memberNumber": "402300137", "firstName": "Naeem", "lastName": "Zaman", "email": "naeem.zaman@icloud.com", "phone": "", "gender": "Male", "dateOfBirth": null, "joinDate": "2025-11-04"},
  {"memberNumber": "402300138", "firstName": "Silver", "lastName": "Esocta", "email": "silveresocta@gmail.com", "phone": "9261230308", "gender": "Other", "dateOfBirth": "1997-11-06", "joinDate": "2026-04-20"},
  {"memberNumber": "402300139", "firstName": "Vincent", "lastName": "Cabingue", "email": "vcabingue@gmail.com", "phone": "9177982323", "gender": "Male", "dateOfBirth": "1993-02-23", "joinDate": "2026-04-20"},
  {"memberNumber": "402300140", "firstName": "Dylan", "lastName": "Gardiola", "email": "dexireeanneleihe@gmail.com", "phone": "9561202807", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-04-19"},
  {"memberNumber": "402300141", "firstName": "Kiel", "lastName": "Mendoza", "email": "donnamorial86@gmail.com", "phone": "9565603037", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-04-17"},
  {"memberNumber": "402300142", "firstName": "Vianca", "lastName": "Valdez", "email": "viixenne@gmail.com", "phone": "9497921042", "gender": "Other", "dateOfBirth": "2001-06-06", "joinDate": "2026-04-22"},
  {"memberNumber": "402300143", "firstName": "Allysia", "lastName": "Castillo", "email": "castillo.allysia@gmail.com", "phone": "9175001254", "gender": "Female", "dateOfBirth": "1996-04-27", "joinDate": "2026-04-27"},
  {"memberNumber": "402300144", "firstName": "Damian", "lastName": "Efergan", "email": "dame.efergan@gmail.com", "phone": "9615330636", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-18"},
  {"memberNumber": "402300145", "firstName": "Soriano Gian Clark", "lastName": "R", "email": "gcrs4225@gmail.com", "phone": "9281744120", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-30"},
  {"memberNumber": "402300146", "firstName": "Jorden Markel A", "lastName": "Otazu", "email": "otazu040477@yahoo.com", "phone": "9992277893", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-05-10"},
  {"memberNumber": "402300147", "firstName": "Ava Sofyna", "lastName": "Ruiz", "email": "stefsabellano@gmail.com", "phone": "", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-22"},
  {"memberNumber": "402300148", "firstName": "Nigel Gabriel", "lastName": "Cabidog", "email": "nigelgabriel08@gmail.com", "phone": "9177820882", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-05-18"},
  {"memberNumber": "402300149", "firstName": "Charles Jacob", "lastName": "Abo", "email": "baby28jane@yahoo.com", "phone": "9565329940", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-04-09"},
  {"memberNumber": "402300150", "firstName": "Luis Matthew", "lastName": "Panuelos", "email": "joantam2021@gmail.com", "phone": "9178328191", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-05-19"},
  {"memberNumber": "402300151", "firstName": "Michael Josh", "lastName": "Desipeda", "email": "mj.desipeda419@gmail.com", "phone": "9763023267", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-02-16"},
  {"memberNumber": "402300152", "firstName": "Camille", "lastName": "Cantalejo", "email": "millecantalejo@gmail.com", "phone": "9175430763", "gender": "Female", "dateOfBirth": null, "joinDate": "2026-06-11"},
  {"memberNumber": "402300153", "firstName": "Adrian", "lastName": "Bravo", "email": "adrian.bravo2@yahoo.com", "phone": "9175453159", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-06-07"},
  {"memberNumber": "402300154", "firstName": "Bon Summer Belle", "lastName": "Viala", "email": "567bonsummer@gmail.com", "phone": "9947214342", "gender": "Female", "dateOfBirth": null, "joinDate": "2026-06-08"},
  {"memberNumber": "402300155", "firstName": "Gabriel Ulrich", "lastName": "Pablo", "email": "theanncanones@gmail.com", "phone": "9432324291", "gender": "Male", "dateOfBirth": null, "joinDate": "2026-06-02"},
  {"memberNumber": "402300156", "firstName": "Charmaine", "lastName": "Refrima", "email": "ccrefrima@gmail.com", "phone": "9266125458", "gender": "Female", "dateOfBirth": null, "joinDate": "2026-06-16"},
  {"memberNumber": "402300157", "firstName": "Athena Xenelle", "lastName": "Layon", "email": "shainearandez01@gmail.com", "phone": "9255607568", "gender": "Female", "dateOfBirth": null, "joinDate": "2026-04-07"},
  {"memberNumber": "402300158", "firstName": "Jecel", "lastName": "Jungaya", "email": "jungayajecel@gmail.com", "phone": "9913417208", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-06-20"},
  {"memberNumber": "402300159", "firstName": "Jan", "lastName": "Asido", "email": "janfasido@gmail.com", "phone": "9611980030", "gender": "Other", "dateOfBirth": null, "joinDate": "2026-06-22"},
];

async function main() {
  const defaultPassword = await bcrypt.hash("member123", 12);
  let created = 0;
  let skipped = 0;

  for (const m of members) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: m.email } });
      if (existing) {
        // If user exists but has no member record, create the member record
        const hasMember = await prisma.member.findUnique({ where: { userId: existing.id } });
        if (!hasMember) {
          await prisma.member.create({
            data: {
              userId: existing.id,
              memberNumber: m.memberNumber,
              firstName: m.firstName,
              lastName: m.lastName,
              phone: m.phone || null,
              gender: m.gender || null,
              dateOfBirth: m.dateOfBirth ? new Date(m.dateOfBirth) : null,
              joinDate: new Date(m.joinDate),
              status: MemberStatus.ACTIVE,
            },
          });
          created++;
        } else {
          console.log(`Skipped (already exists): ${m.email}`);
          skipped++;
        }
        continue;
      }

      await prisma.user.create({
        data: {
          email: m.email,
          name: `${m.firstName} ${m.lastName}`,
          password: defaultPassword,
          role: Role.MEMBER,
          member: {
            create: {
              memberNumber: m.memberNumber,
              firstName: m.firstName,
              lastName: m.lastName,
              phone: m.phone || null,
              gender: m.gender || null,
              dateOfBirth: m.dateOfBirth ? new Date(m.dateOfBirth) : null,
              joinDate: new Date(m.joinDate),
              status: MemberStatus.ACTIVE,
            },
          },
        },
      });
      created++;
    } catch (e: any) {
      console.error(`Error on ${m.email}:`, e.message);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
