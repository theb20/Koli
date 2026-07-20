"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_AGE = void 0;
exports.getAge = getAge;
/** Âge en années révolues à la date du jour, à partir d'une date de naissance. */
function getAge(birthdate) {
    const now = new Date();
    let age = now.getFullYear() - birthdate.getFullYear();
    const hasHadBirthdayThisYear = now.getMonth() > birthdate.getMonth() ||
        (now.getMonth() === birthdate.getMonth() && now.getDate() >= birthdate.getDate());
    if (!hasHadBirthdayThisYear)
        age--;
    return age;
}
exports.MIN_AGE = 18;
//# sourceMappingURL=age.js.map